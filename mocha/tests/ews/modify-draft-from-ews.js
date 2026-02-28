import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Modify Draft From EWS', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountPassword;
	const recipientEmail = 'foo@example.com';
	const messageSubject = 'Create draft with only subject-subject';
	const messageContent = 'Modify draft-add content and recipient from EWS-content';
	const messageSubject1 = 'Create draft with subject and content-subject';
	const messageContent1 = 'Create draft with subject and content-content';
	const messageContent2 = 'Modify draft-Modify content from EWS';

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = 'test123';

		const accountName = `ewstest${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountEmail = accountName;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Create draft with subject in ZWC and sync on EWS Modify same draft using EWS, add content and recipient and sync to ZWC', async () => {
		// ZWC: Save draft with subject only
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<su>${messageSubject}</su>
					<mp ct="text/plain">
						<content></content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not be a Fault');
		const draftId = saveDraftRes.SaveDraftResponse.m.id;

		// EWS: GetFolder for Drafts
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="drafts">
						<t:Mailbox>
							<t:EmailAddress>${accountEmail}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			accountEmail, accountPassword
		);
		const getFolderBody = ews.getBody(getFolderRes);
		const getFolderMsg = getFolderBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		const draftsId = folderMsg.Folders.Folder.FolderId.$.Id;
		assert.equal(draftsId, '6', 'Drafts folder Id should be 6');
		assert.equal(folderMsg.Folders.Folder.DisplayName, 'Drafts',
			'DisplayName should be Drafts');

		// EWS: SyncFolderItems on Drafts
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${draftsId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
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

		// EWS: GetItem to verify draft subject
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
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			accountEmail, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Message.Subject, messageSubject,
			'Subject should match');

		// EWS: UpdateItem - add content and recipient via MimeContent
		const updateRes = await ews.makeEWSRequest(
			`<UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				ConflictResolution="AutoResolve" MessageDisposition="SaveOnly">
				<SavedItemFolderId>
					<t:FolderId Id="6"/>
				</SavedItemFolderId>
				<ItemChanges>
					<t:ItemChange>
						<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}"/>
						<t:Updates>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:MimeContent"/>
								<t:Message>
									<t:MimeContent CharacterSet="UTF-8">VXNlci1BZ2VudDogTWljcm9zb2Z0LU1hY091dGxvb2svZi4yNi4wLjE3MDkwMgpTdWJqZWN0OiBDcmVhdGUgZHJhZnQgd2l0aCBvbmx5IHN1YmplY3Qtc3ViamVjdApUbzogZm9vIDxmb29AZXhhbXBsZS5jb20+ClRocmVhZC1Ub3BpYzogQ3JlYXRlIGRyYWZ0IHdpdGggb25seSBzdWJqZWN0LXN1YmplY3QKTWltZS12ZXJzaW9uOiAxLjAKQ29udGVudC10eXBlOiBtdWx0aXBhcnQvYWx0ZXJuYXRpdmU7Cglib3VuZGFyeT0iQl8zNTg4Njg0NzUyXzExNDA3NDA4NTIiCgo+IFRoaXMgbWVzc2FnZSBpcyBpbiBNSU1FIGZvcm1hdC4gU2luY2UgeW91ciBtYWlsIHJlYWRlciBkb2VzIG5vdCB1bmRlcnN0YW5kCnRoaXMgZm9ybWF0LCBzb21lIG9yIGFsbCBvZiB0aGlzIG1lc3NhZ2UgbWF5IG5vdCBiZSBsZWdpYmxlLgoKLS1CXzM1ODg2ODQ3NTJfMTE0MDc0MDg1MgpDb250ZW50LXR5cGU6IHRleHQvcGxhaW47CgljaGFyc2V0PSJVVEYtOCIKQ29udGVudC10cmFuc2Zlci1lbmNvZGluZzogN2JpdAoKTW9kaWZ5IGRyYWZ0LWFkZCBjb250ZW50IGFuZCByZWNpcGllbnQgZnJvbSBFV1MtY29udGVudAoKCi0tQl8zNTg4Njg0NzUyXzExNDA3NDA4NTIKQ29udGVudC10eXBlOiB0ZXh0L2h0bWw7CgljaGFyc2V0PSJVVEYtOCIKQ29udGVudC10cmFuc2Zlci1lbmNvZGluZzogcXVvdGVkLXByaW50YWJsZQoKPGh0bWwgeG1sbnM6dj0zRCJ1cm46c2NoZW1hcy1taWNyb3NvZnQtY29tOnZtbCIgeG1sbnM6bz0zRCJ1cm46c2NoZW1hcy1taWNyb3NvZj0KdC1jb206b2ZmaWNlOm9mZmljZSIgeG1sbnM6dz0zRCJ1cm46c2NoZW1hcy1taWNyb3NvZnQtY29tOm9mZmljZTp3b3JkIiB4bWxuczptPQo9M0QiaHR0cDovL3NjaGVtYXMubWljcm9zb2Z0LmNvbS9vZmZpY2UvMjAwNC8xMi9vbW1sIiB4bWxuczptdj0zRCJodHRwOi8vbWFjVm1sUz0KY2hlbWFVcmkiIHhtbG5zPTNEImh0dHA6Ly93d3cudzMub3JnL1RSL1JFQy1odG1sNDAiPjxoZWFkPjwvaGVhZD48Ym9keSBiZ2NvbG9yPTNEd2hpdGUgbGFuZz0zREVOLVVTPjxkaXYgY2xhc3M9M0RXb3JkU2VjdGlvbjE+PHAgY2xhc3M9M0RNc29Ob3JtYWw+PHNwYW4gc3R5bGU9M0QnZm9udC1zaXplOjExLjBwdCc+TW9kaWZ5IGRyYWZ0LWFkZCBjb250ZW50IGFuZCByZWNpcGllbnQgZnJvbSBFV1MtY29udGVudDxvOnA+PC9vOnA+PC9zcGFuPjwvcD48L2Rpdj48L2JvZHk+PC9odG1sPgoKLS1CXzM1ODg2ODQ3NTJfMTE0MDc0MDg1Mi0tCgo=</t:MimeContent>
								</t:Message>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="message:IsReadReceiptRequested"/>
								<t:Message>
									<t:IsReadReceiptRequested>false</t:IsReadReceiptRequested>
								</t:Message>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="message:IsDeliveryReceiptRequested"/>
								<t:Message>
									<t:IsDeliveryReceiptRequested>false</t:IsDeliveryReceiptRequested>
								</t:Message>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Sensitivity"/>
								<t:Message>
									<t:Sensitivity>Normal</t:Sensitivity>
								</t:Message>
							</t:SetItemField>
						</t:Updates>
					</t:ItemChange>
				</ItemChanges>
			</UpdateItem>`,
			accountEmail, accountPassword
		);
		const updateBody = ews.getBody(updateRes);
		const updateMsg = updateBody.UpdateItemResponse
			.ResponseMessages.UpdateItemResponseMessage;
		const updateMessage = Array.isArray(updateMsg) ? updateMsg[0] : updateMsg;
		assert.equal(updateMessage.$.ResponseClass, 'Success',
			'UpdateItem should succeed');

		// EWS: SyncFolderItems to pick up the update
		const syncRes2 = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="6" />
				</SyncFolderId>
				<SyncState>${syncState}</SyncState>
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncBody2 = ews.getBody(syncRes2);
		const syncMsg2 = syncBody2.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage2 = Array.isArray(syncMsg2) ? syncMsg2[0] : syncMsg2;
		assert.equal(syncMessage2.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const updates = Array.isArray(syncMessage2.Changes.Update)
			? syncMessage2.Changes.Update : [syncMessage2.Changes.Update];
		const updatedItemId = updates[0].Message.ItemId.$.Id;
		const updatedChangeKey = updates[0].Message.ItemId.$.ChangeKey;

		// ZWC: Verify the modified draft
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const su = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m[0] : searchRes.SearchResponse.m;
		assert.exists(su, 'Should find message');
		assert.include(su.su, messageSubject, 'Subject should match');
		const msgId = su.id;

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`, accountAuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not be a Fault');
		const msg = getMsgRes.GetMsgResponse.m;
		const msgObj = Array.isArray(msg) ? msg[0] : msg;
		assert.include(msgObj.su, messageSubject, 'Subject should contain original subject');
		assert.include(msgObj.fr, messageContent, 'Content should contain modified content');
		const toRecipient = Array.isArray(msgObj.e)
			? msgObj.e.find(e => e.t === 't' && e.a === recipientEmail)
			: (msgObj.e?.t === 't' && msgObj.e?.a === recipientEmail ? msgObj.e : null);
		assert.exists(toRecipient, 'To recipient should be foo@example.com');
	});


	it('Sanity | Create draft with subject and content in ZWC and sync on EWS Modify content of draft using EWS and sync to ZWC', async () => {
		// ZWC: Save draft with subject and content
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<su>${messageSubject1}</su>
					<mp ct="text/plain">
						<content></content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not be a Fault');

		// EWS: GetFolder for Drafts
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="drafts">
						<t:Mailbox>
							<t:EmailAddress>${accountEmail}</t:EmailAddress>
						</t:Mailbox>
					</t:DistinguishedFolderId>
				</FolderIds>
			</GetFolder>`,
			accountEmail, accountPassword
		);
		const getFolderBody = ews.getBody(getFolderRes);
		const getFolderMsg = getFolderBody.GetFolderResponse
			.ResponseMessages.GetFolderResponseMessage;
		const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;
		assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
		const draftsId = folderMsg.Folders.Folder.FolderId.$.Id;
		assert.equal(draftsId, '6', 'Drafts folder Id should be 6');
		assert.equal(folderMsg.Folders.Folder.DisplayName, 'Drafts',
			'DisplayName should be Drafts');

		// EWS: SyncFolderItems on Drafts (empty SyncState to get all items)
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${draftsId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const allCreates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const lastCreate = allCreates[allCreates.length - 1];
		const mailItemId = lastCreate.Message.ItemId.$.Id;
		const mailChangeKey = lastCreate.Message.ItemId.$.ChangeKey;
		const syncState = syncMessage.SyncState;

		// EWS: GetItem to verify draft subject
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
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
			accountEmail, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(itemMsg.Items.Message.Subject, messageSubject1,
			'Subject should match');

		// EWS: UpdateItem - modify content via MimeContent
		const updateRes = await ews.makeEWSRequest(
			`<UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				ConflictResolution="AutoResolve" MessageDisposition="SaveOnly">
				<SavedItemFolderId>
					<t:FolderId Id="6"/>
				</SavedItemFolderId>
				<ItemChanges>
					<t:ItemChange>
						<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}"/>
						<t:Updates>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:MimeContent"/>
								<t:Message>
									<t:MimeContent CharacterSet="UTF-8">VXNlci1BZ2VudDogTWljcm9zb2Z0LU1hY091dGxvb2svZi4yNi4wLjE3MDkwMgpTdWJqZWN0OiBDcmVhdGUgZHJhZnQgd2l0aCBzdWJqZWN0IGFuZCBjb250ZW50LXN1YmplY3QKVGhyZWFkLVRvcGljOiBDcmVhdGUgZHJhZnQgd2l0aCBzdWJqZWN0IGFuZCBjb250ZW50LXN1YmplY3QKTWltZS12ZXJzaW9uOiAxLjAKQ29udGVudC10eXBlOiBtdWx0aXBhcnQvYWx0ZXJuYXRpdmU7Cglib3VuZGFyeT0iQl8zNTg4Njg0NzUyXzExNDA3NDA4NTIiCgo+IFRoaXMgbWVzc2FnZSBpcyBpbiBNSU1FIGZvcm1hdC4gU2luY2UgeW91ciBtYWlsIHJlYWRlciBkb2VzIG5vdCB1bmRlcnN0YW5kCnRoaXMgZm9ybWF0LCBzb21lIG9yIGFsbCBvZiB0aGlzIG1lc3NhZ2UgbWF5IG5vdCBiZSBsZWdpYmxlLgoKLS1CXzM1ODg2ODQ3NTJfMTE0MDc0MDg1MgpDb250ZW50LXR5cGU6IHRleHQvcGxhaW47CgljaGFyc2V0PSJVVEYtOCIKQ29udGVudC10cmFuc2Zlci1lbmNvZGluZzogN2JpdAoKTW9kaWZ5IGRyYWZ0LU1vZGlmeSBjb250ZW50IGZyb20gRVdTCgoKLS1CXzM1ODg2ODQ3NTJfMTE0MDc0MDg1MgpDb250ZW50LXR5cGU6IHRleHQvaHRtbDsKCWNoYXJzZXQ9IlVURi04IgpDb250ZW50LXRyYW5zZmVyLWVuY29kaW5nOiBxdW90ZWQtcHJpbnRhYmxlCgo8aHRtbD48aGVhZD48L2hlYWQ+PGJvZHkgYmdjb2xvcj0zRHdoaXRlIGxhbmc9M0RFTi1VUz48ZGl2IGNsYXNzPTNEV29yZFNlY3Rpb24xPjxwIGNsYXNzPTNETXNvTm9ybWFsPjxzcGFuIHN0eWxlPTNEJ2ZvbnQtc2l6ZToxMS4wcHQnPk1vZGlmeSBkcmFmdC1Nb2RpZnkgY29udGVudCBmcm9tIEVXUzxvOnA+PC9vOnA+PC9zcGFuPjwvcD48L2Rpdj48L2JvZHk+PC9odG1sPgoKLS1CXzM1ODg2ODQ3NTJfMTE0MDc0MDg1Mi0tCgo=</t:MimeContent>
								</t:Message>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="message:IsReadReceiptRequested"/>
								<t:Message>
									<t:IsReadReceiptRequested>false</t:IsReadReceiptRequested>
								</t:Message>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="message:IsDeliveryReceiptRequested"/>
								<t:Message>
									<t:IsDeliveryReceiptRequested>false</t:IsDeliveryReceiptRequested>
								</t:Message>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Sensitivity"/>
								<t:Message>
									<t:Sensitivity>Normal</t:Sensitivity>
								</t:Message>
							</t:SetItemField>
						</t:Updates>
					</t:ItemChange>
				</ItemChanges>
			</UpdateItem>`,
			accountEmail, accountPassword
		);
		const updateBody = ews.getBody(updateRes);
		const updateMsg = updateBody.UpdateItemResponse
			.ResponseMessages.UpdateItemResponseMessage;
		const updateMessage = Array.isArray(updateMsg) ? updateMsg[0] : updateMsg;
		assert.equal(updateMessage.$.ResponseClass, 'Success',
			'UpdateItem should succeed');

		// EWS: SyncFolderItems to pick up the update
		const syncRes2 = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="6" />
				</SyncFolderId>
				<SyncState>${syncState}</SyncState>
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncBody2 = ews.getBody(syncRes2);
		const syncMsg2 = syncBody2.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage2 = Array.isArray(syncMsg2) ? syncMsg2[0] : syncMsg2;
		assert.equal(syncMessage2.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');

		// ZWC: Verify the modified draft
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject1}</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const su = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m[0] : searchRes.SearchResponse.m;
		assert.exists(su, 'Should find message');
		assert.include(su.su, messageSubject1, 'Subject should match');
		const msgId = su.id;

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`, accountAuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not be a Fault');
		const msg = getMsgRes.GetMsgResponse.m;
		const msgObj = Array.isArray(msg) ? msg[0] : msg;
		assert.include(msgObj.su, messageSubject1, 'Subject should contain original subject');
		assert.include(msgObj.fr, messageContent2, 'Content should contain modified content');
	});
});
