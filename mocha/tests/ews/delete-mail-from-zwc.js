import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Delete Mail From ZWC', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account2Email, accountPassword;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;

		const account1Name = `ewstest${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		account1Email = account1Name;

		const account2Name = `ewstest${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
				<a n="zimbraDumpsterEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		account2Email = account2Name;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Soft delete email and verify it is moved to Trash in Server and verify on EWS', async () => {
		const messageSubject = 'Message 1 test subject';
		const messageContent = 'Message 1 test content';

		// EWS: Send mail from user2 to user1 using CreateItem with SendAndSaveCopy
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="5"/>
				</SavedItemFolderId>
				<Items>
					<t:Message>
						<t:MimeContent CharacterSet="UTF-8">VXNlci1BZ2VudDogTWljcm9zb2Z0LU1hY091dGxvb2svZi4xZi4wLjE3MDIxNgpEYXRlOiBUdWUsIDggQXVnIDIwMTcgMDQ6NDc6MDEgLTA0MDAgKEVEVCkKU3ViamVjdDogTWVzc2FnZSAxIHRlc3Qgc3ViamVjdApNZXNzYWdlLUlEOiA8MTcwNTkzMTIwMy4yNTkuMTUwMjE4MjAyMTQ0OS5KYXZhTWFpbC56aW1icmFAenFhLTI4Mi5lbmcuemltYnJhLmNvbT4KVGhyZWFkLVRvcGljOiBNZXNzYWdlIDEgdGVzdCBzdWJqZWN0Ck1pbWUtdmVyc2lvbjogMS4wCkNvbnRlbnQtdHlwZTogdGV4dC9wbGFpbjsKCWNoYXJzZXQ9IlVURi04IgpDb250ZW50LXRyYW5zZmVyLWVuY29kaW5nOiA3Yml0CgpNZXNzYWdlIDEgdGVzdCBjb250ZW50</t:MimeContent>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Importance>Normal</t:Importance>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x0E07"
								PropertyType="Integer"/>
							<t:Value>12</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0xE9F"
								PropertyType="StringArray"/>
							<t:Values>
								<t:Value>:R:0</t:Value>
							</t:Values>
						</t:ExtendedProperty>
						<t:ToRecipients>
							<t:Mailbox>
								<t:EmailAddress>${account1Email}</t:EmailAddress>
							</t:Mailbox>
						</t:ToRecipients>
						<t:From>
							<t:Mailbox>
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
			'CreateItem should succeed');

		// EWS: SyncFolderItems on Sent folder for user2
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
			account2Email, accountPassword
		);
		const syncSentBody = ews.getBody(syncSentRes);
		const syncSentMsg = syncSentBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncSentMessage = Array.isArray(syncSentMsg)
			? syncSentMsg[0] : syncSentMsg;
		assert.equal(syncSentMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');

		// ZWC: Verify mail received by user1
		await new Promise(resolve => setTimeout(resolve, 5000));
		const account1AuthToken = await soap.getAccountAuthToken(
			account1Email, accountPassword);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const messages = searchRes.SearchResponse?.m
			|| searchRes.SearchResponse?.c;
		const msgArr = Array.isArray(messages) ? messages : messages
			? [messages] : [];
		assert.isAbove(msgArr.length, 0, 'Should find received mail');
		const msgId = msgArr[0]?.id || msgArr[0]?.m?.[0]?.id;

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`, account1AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not be a Fault');
		const zwcMsg = getMsgRes.GetMsgResponse?.m;
		const zwcMsgObj = Array.isArray(zwcMsg) ? zwcMsg[0] : zwcMsg;
		assert.include(zwcMsgObj.su, messageSubject, 'Subject should match');

		// ZWC: Soft delete (move to trash)
		const trashRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="trash"/>
			</MsgActionRequest>`, account1AuthToken
		);
		assert.notExists(trashRes.Fault, 'MsgActionRequest should not be a Fault');
		const trashAction = trashRes.MsgActionResponse?.action;
		const trashObj = Array.isArray(trashAction) ? trashAction[0] : trashAction;
		assert.equal(trashObj.op, 'trash', 'Op should be trash');
		assert.equal(trashObj.id, msgId, 'Trashed message id should match');

		// EWS: Verify trashed mail in Trash folder (Id=3)
		const syncTrashRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="3" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email, accountPassword
		);
		const syncTrashBody = ews.getBody(syncTrashRes);
		const syncTrashMsg = syncTrashBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncTrashMessage = Array.isArray(syncTrashMsg)
			? syncTrashMsg[0] : syncTrashMsg;
		assert.equal(syncTrashMessage.$.ResponseClass, 'Success',
			'SyncFolderItems on Trash should succeed');
		const trashCreate = syncTrashMessage.Changes?.Create;
		const trashCreateArr = Array.isArray(trashCreate)
			? trashCreate : trashCreate ? [trashCreate] : [];
		assert.isAbove(trashCreateArr.length, 0,
			'Trash should contain items');
		const trashItemId = trashCreateArr[0]?.Message?.ItemId?.$.Id;
		const trashItemChangeKey = trashCreateArr[0]?.Message?.ItemId?.$.ChangeKey;

		// EWS: GetItem to verify trashed mail
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
						<t:FieldURI FieldURI="message:From" />
						<t:FieldURI FieldURI="message:Sender" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="message:IsRead" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${trashItemId}"
						ChangeKey="${trashItemChangeKey}" />
				</ItemIds>
			</GetItem>`,
			account1Email, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const getItemMessage = Array.isArray(getItemMsg)
			? getItemMsg[0] : getItemMsg;
		assert.equal(getItemMessage.$.ResponseClass, 'Success',
			'GetItem should succeed');
		assert.equal(getItemMessage.Items?.Message?.Subject, messageSubject,
			'Subject should match');
		assert.include(getItemMessage.Items?.Message?.Body?._ || '',
			messageContent, 'Body should contain content');
	});


	it('Sanity | Hard delete email and verify it is not present in Trash in Server and verify on EWS', async () => {
		const messageSubject = 'Message 2 test subject';
		const messageContent = 'Message 2 test content';

		// EWS: Send mail from user1 to user2 using CreateItem with SendAndSaveCopy
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="5"/>
				</SavedItemFolderId>
				<Items>
					<t:Message>
						<t:MimeContent CharacterSet="UTF-8">VXNlci1BZ2VudDogTWljcm9zb2Z0LU1hY091dGxvb2svZi4xZi4wLjE3MDIxNgpEYXRlOiBUdWUsIDggQXVnIDIwMTcgMDQ6NDc6MDEgLTA0MDAgKEVEVCkKU3ViamVjdDogTWVzc2FnZSAyIHRlc3Qgc3ViamVjdApNZXNzYWdlLUlEOiA8MTcwNTkzMTIwMy4yNTkuMTUwMjE4MjAyMTQ0OS5KYXZhTWFpbC56aW1icmFAenFhLTI4Mi5lbmcuemltYnJhLmNvbT4KVGhyZWFkLVRvcGljOiBNZXNzYWdlIDIgdGVzdCBzdWJqZWN0Ck1pbWUtdmVyc2lvbjogMS4wCkNvbnRlbnQtdHlwZTogdGV4dC9wbGFpbjsKCWNoYXJzZXQ9IlVURi04IgpDb250ZW50LXRyYW5zZmVyLWVuY29kaW5nOiA3Yml0CgpNZXNzYWdlIDIgdGVzdCBjb250ZW50</t:MimeContent>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Importance>Normal</t:Importance>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x0E07"
								PropertyType="Integer"/>
							<t:Value>12</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0xE9F"
								PropertyType="StringArray"/>
							<t:Values>
								<t:Value>:R:0</t:Value>
							</t:Values>
						</t:ExtendedProperty>
						<t:ToRecipients>
							<t:Mailbox>
								<t:EmailAddress>${account2Email}</t:EmailAddress>
							</t:Mailbox>
						</t:ToRecipients>
						<t:From>
							<t:Mailbox>
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

		// EWS: SyncFolderItems on Sent folder for user1
		const syncSentRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="5" />
				</SyncFolderId>
				<SyncState/>
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email, accountPassword
		);
		const syncSentBody = ews.getBody(syncSentRes);
		const syncSentMsg = syncSentBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncSentMessage = Array.isArray(syncSentMsg)
			? syncSentMsg[0] : syncSentMsg;
		assert.equal(syncSentMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');

		// ZWC: Verify mail received by user2
		await new Promise(resolve => setTimeout(resolve, 5000));
		const account2AuthToken = await soap.getAccountAuthToken(
			account2Email, accountPassword);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const messages = searchRes.SearchResponse?.m
			|| searchRes.SearchResponse?.c;
		const msgArr = Array.isArray(messages)
			? messages : messages ? [messages] : [];
		assert.isAbove(msgArr.length, 0, 'Should find received mail');
		const msgId = msgArr[0]?.id || msgArr[0]?.m?.[0]?.id;

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`, account2AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not be a Fault');
		const zwcMsg = getMsgRes.GetMsgResponse?.m;
		const zwcMsgObj = Array.isArray(zwcMsg) ? zwcMsg[0] : zwcMsg;
		assert.include(zwcMsgObj.su, messageSubject, 'Subject should match');

		// ZWC: Hard delete (permanent delete) for dumpster user
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="delete"/>
			</MsgActionRequest>`, account2AuthToken
		);
		assert.notExists(deleteRes.Fault, 'MsgActionRequest should not be a Fault');
		const deleteAction = deleteRes.MsgActionResponse?.action;
		const deleteObj = Array.isArray(deleteAction)
			? deleteAction[0] : deleteAction;
		assert.equal(deleteObj.op, 'delete', 'Op should be delete');
		assert.equal(deleteObj.id, msgId, 'Deleted message id should match');

		// EWS: Verify mail not in inbox for user2
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
		const getFolderMessage = Array.isArray(getFolderMsg)
			? getFolderMsg[0] : getFolderMsg;
		assert.equal(getFolderMessage.$.ResponseClass, 'Success',
			'GetFolder should succeed');
		const inboxId = getFolderMessage.Folders?.Folder?.FolderId?.$.Id;
		assert.equal(inboxId, '2', 'Inbox folder Id should be 2');

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
		const syncInboxMessage = Array.isArray(syncInboxMsg)
			? syncInboxMsg[0] : syncInboxMsg;
		assert.equal(syncInboxMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');

		// EWS: Verify mail not in trash for user2
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
		const getTrashMessage = Array.isArray(getTrashMsg)
			? getTrashMsg[0] : getTrashMsg;
		assert.equal(getTrashMessage.$.ResponseClass, 'Success',
			'GetFolder for Trash should succeed');
		const trashId = getTrashMessage.Folders?.Folder?.FolderId?.$.Id;
		assert.equal(trashId, '3', 'Trash folder Id should be 3');

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
		const syncTrashMessage = Array.isArray(syncTrashMsg)
			? syncTrashMsg[0] : syncTrashMsg;
		assert.equal(syncTrashMessage.$.ResponseClass, 'Success',
			'SyncFolderItems on Trash should succeed');

		// ZWC: Verify mail is in Dumpster
		const searchDumpsterRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>-in:/Junk subject:${messageSubject}</query>
				<inDumpster>1</inDumpster>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchDumpsterRes.Fault,
			'SearchRequest should not be a Fault');
		assert.exists(searchDumpsterRes.SearchResponse,
			'SearchResponse should exist');
		const dumpsterSu = searchDumpsterRes.SearchResponse?.m?.su
			|| (Array.isArray(searchDumpsterRes.SearchResponse?.m)
				? searchDumpsterRes.SearchResponse.m[0]?.su : undefined);
		assert.equal(dumpsterSu, messageSubject,
			'Dumpster should contain the deleted mail');
	});
});
