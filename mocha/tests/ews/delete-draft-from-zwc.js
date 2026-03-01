import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Delete Draft From ZWC', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountPassword;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;

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

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Create draft with subject and content in EWS and sync on ZWC client Delete same draft from ZWC and sync on EWS', async () => {
		const messageSubject = 'Delete draft with subject and content-subject';
		const messageContent = 'Delete draft with subject and content-content';
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SaveOnly">
				<SavedItemFolderId>
					<t:FolderId Id="6"/>
				</SavedItemFolderId>
				<Items>
					<t:Message>
						<t:MimeContent CharacterSet="UTF-8">VXNlci1BZ2VudDogTWljcm9zb2Z0LU1hY091dGxvb2svZi4xZi4wLjE3MDIxNgpTdWJqZWN0OiBEZWxldGUgZHJhZnQgd2l0aCBzdWJqZWN0IGFuZCBjb250ZW50LXN1YmplY3QKVGhyZWFkLVRvcGljOiBEZWxldGUgZHJhZnQgd2l0aCBzdWJqZWN0IGFuZCBjb250ZW50LXN1YmplY3QKTWltZS12ZXJzaW9uOiAxLjAKQ29udGVudC10eXBlOiB0ZXh0L3BsYWluOwoJY2hhcnNldD0iVVRGLTgiCkNvbnRlbnQtdHJhbnNmZXItZW5jb2Rpbmc6IDdiaXQKCkRlbGV0ZSBkcmFmdCB3aXRoIHN1YmplY3QgYW5kIGNvbnRlbnQtY29udGVudA==</t:MimeContent>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Importance>Normal</t:Importance>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x0E07"
								PropertyType="Integer"/>
							<t:Value>12</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyTag="0x1090"
								PropertyType="Integer"/>
							<t:Value>0</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI DistinguishedPropertySetId="Common"
								PropertyId="34051" PropertyType="Boolean"/>
							<t:Value>false</t:Value>
						</t:ExtendedProperty>
						<t:From>
							<t:Mailbox>
								<t:EmailAddress>${accountEmail}</t:EmailAddress>
							</t:Mailbox>
						</t:From>
						<t:IsRead>false</t:IsRead>
					</t:Message>
				</Items>
			</CreateItem>`,
			accountEmail, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;

		// Verify response
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem should succeed');
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="6" />
				</SyncFolderId>
				<SyncState/>
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
		const syncState = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMsgObj = Array.isArray(syncState) ? syncState[0] : syncState;
		const ewsSyncState = syncMsgObj.SyncState;

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);

		// Search for the item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		const messages = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : [];
		assert.isAbove(messages.length, 0, 'Should find message');
		const msgId = messages[0].id;

		// Get the message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not be a Fault');
		const msg = getMsgRes.GetMsgResponse.m;
		const msgObj = Array.isArray(msg) ? msg[0] : msg;
		assert.include(msgObj.su, messageSubject, 'Subject should match');
		assert.include(msgObj.mp?.content || msgObj.fr || '', messageContent,
			'Content should match');
		assert.include(msgObj.f || '', 's', 'Should have sent/draft flag');
		assert.include(msgObj.f || '', 'd', 'Should have draft flag');

		// Perform message action
		const trashRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="trash"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(trashRes.Fault, 'MsgActionRequest should not be a Fault');
		const trashAction = trashRes.MsgActionResponse?.action;
		const trashActionObj = Array.isArray(trashAction) ? trashAction[0] : trashAction;
		assert.equal(trashActionObj.op, 'trash', 'Op should be trash');
		assert.equal(trashActionObj.id, msgId, 'Trashed message id should match');
		const getFolderRes = await ews.makeEWSRequest(
			`<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="deleteditems">
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
		const getFolderMessage = Array.isArray(getFolderMsg)
			? getFolderMsg[0] : getFolderMsg;
		assert.equal(getFolderMessage.$.ResponseClass, 'Success',
			'GetFolder should succeed');
		const trashFolderId = getFolderMessage.Folders?.Folder?.FolderId?.$.Id;
		assert.equal(trashFolderId, '3', 'Trash folder Id should be 3');
		const trashDisplayName = getFolderMessage.Folders?.Folder?.DisplayName;
		assert.equal(trashDisplayName, 'Trash', 'Display name should be Trash');
		const syncTrashRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${trashFolderId}" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
			accountEmail, accountPassword
		);
		const syncTrashBody = ews.getBody(syncTrashRes);
		const syncTrashMsg = syncTrashBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncTrashMessage = Array.isArray(syncTrashMsg)
			? syncTrashMsg[0] : syncTrashMsg;
		assert.equal(syncTrashMessage.$.ResponseClass, 'Success',
			'SyncFolderItems on Trash should succeed');
		const trashChanges = syncTrashMessage.Changes;
		const trashCreate = trashChanges?.Create;
		const trashCreateArr = Array.isArray(trashCreate)
			? trashCreate : trashCreate ? [trashCreate] : [];
		assert.isAbove(trashCreateArr.length, 0,
			'Trash should contain created items');
		const trashItemId = trashCreateArr[0]?.Message?.ItemId?.$.Id
			|| trashCreateArr[0]?.ItemId?.$.Id;
		const trashItemChangeKey = trashCreateArr[0]?.Message?.ItemId?.$.ChangeKey
			|| trashCreateArr[0]?.ItemId?.$.ChangeKey;
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
						<t:FieldURI FieldURI="item:Importance"/>
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${trashItemId}"
						ChangeKey="${trashItemChangeKey}" />
				</ItemIds>
			</GetItem>`,
			accountEmail, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const getItemMessage = Array.isArray(getItemMsg)
			? getItemMsg[0] : getItemMsg;
		assert.equal(getItemMessage.$.ResponseClass, 'Success',
			'GetItem should succeed');
		const itemSubject = getItemMessage.Items?.Message?.Subject;
		assert.equal(itemSubject, messageSubject, 'Subject should match');
		const itemBody = getItemMessage.Items?.Message?.Body?._;
		assert.include(itemBody || '', messageContent, 'Body should contain content');
		const itemImportance = getItemMessage.Items?.Message?.Importance;
		assert.equal(itemImportance, 'Normal', 'Importance should be Normal');
	});
});
