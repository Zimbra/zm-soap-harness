import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Delete Mail From EWS', function () {
    this.timeout(120 * 1000);
    let adminAuthToken, account1Email, account2Email, accountPassword;

    before(async function () {
        await main.before(this.ctx);
        adminAuthToken = await soap.getAdminAuthToken();
        accountPassword = 'test123';

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
    it('Sanity | Soft delete email and verify it is moved to Trash in EWS client and verify on server', async () => {
        const messageSubject = `subject1${common.getUniqueString()}`;
        const messageContent = 'Message 1 test content';

        // Send mail from user2 to user1 from Server
        const account2AuthToken = await soap.getAccountAuthToken(account2Email, accountPassword);
        const sendRes = await soap.makeSOAPEnvelopeAccount(
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
        assert.notExists(sendRes.Fault, 'SendMsgRequest should not be a Fault');

        // EWS: GetFolder for inbox
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
            account1Email, accountPassword
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

        // EWS: SyncFolderItems on Inbox
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
            account1Email, accountPassword
        );
        const syncBody = ews.getBody(syncRes);
        const syncMsg = syncBody.SyncFolderItemsResponse
            .ResponseMessages.SyncFolderItemsResponseMessage;
        const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
        assert.equal(syncMessage.$.ResponseClass, 'Success',
            'SyncFolderItems should succeed');
        const changes = syncMessage.Changes;
        const createItems = Array.isArray(changes?.Create)
            ? changes.Create : changes?.Create ? [changes.Create] : [];
        assert.isAbove(createItems.length, 0, 'Should have created items');
        const matchedItem = createItems.find(c => c?.Message?.Subject === messageSubject);
        assert.exists(matchedItem, 'Should find message matching subject');
        const mailItemId = matchedItem.Message.ItemId.$.Id;
        const mailItemChangeKey = matchedItem.Message.ItemId.$.ChangeKey;

        // EWS: GetItem to verify received mail
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
					<t:ItemId Id="${mailItemId}"
						ChangeKey="${mailItemChangeKey}" />
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
        assert.include(getItemMessage.Items?.Message?.Body?._ || '', messageContent,
            'Body should contain content');
        assert.equal(getItemMessage.Items?.Message?.Importance, 'Normal',
            'Importance should be Normal');

        // EWS: Soft delete (move to trash) using MoveItem
        const moveRes = await ews.makeEWSRequest(
            `<MoveItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ToFolderId>
					<t:FolderId Id="3"/>
				</ToFolderId>
				<ItemIds>
					<t:ItemId Id="${mailItemId}"
						ChangeKey="${mailItemChangeKey}" />
				</ItemIds>
			</MoveItem>`,
            account1Email, accountPassword
        );
        const moveBody = ews.getBody(moveRes);
        const moveMsg = moveBody.MoveItemResponse
            .ResponseMessages.MoveItemResponseMessage;
        const moveMessage = Array.isArray(moveMsg) ? moveMsg[0] : moveMsg;
        assert.equal(moveMessage.$.ResponseClass, 'Success',
            'MoveItem should succeed');

        // EWS: SyncFolderItems on Trash to verify mail moved there
        const syncTrashRes = await ews.makeEWSRequest(
            `<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="3" />
				</SyncFolderId>
				<SyncState/>
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
        const trashMailId = trashCreateArr[0]?.Message?.ItemId?.$.Id;
        const trashMailChangeKey = trashCreateArr[0]?.Message?.ItemId?.$.ChangeKey;

        // EWS: GetItem on trashed mail to verify subject and content
        const getTrashItemRes = await ews.makeEWSRequest(
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
					<t:ItemId Id="${trashMailId}"
						ChangeKey="${trashMailChangeKey}" />
				</ItemIds>
			</GetItem>`,
            account1Email, accountPassword
        );
        const getTrashItemBody = ews.getBody(getTrashItemRes);
        const getTrashItemMsg = getTrashItemBody.GetItemResponse
            .ResponseMessages.GetItemResponseMessage;
        const getTrashItemMessage = Array.isArray(getTrashItemMsg)
            ? getTrashItemMsg[0] : getTrashItemMsg;
        assert.equal(getTrashItemMessage.$.ResponseClass, 'Success',
            'GetItem on trash should succeed');
        assert.equal(getTrashItemMessage.Items?.Message?.Subject, messageSubject,
            'Subject should match');
        assert.include(getTrashItemMessage.Items?.Message?.Body?._ || '',
            messageContent, 'Body should contain content');

        // ZWC: Verify soft deleted mail is in Trash
        const account1AuthToken = await soap.getAccountAuthToken(
            account1Email, accountPassword);
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>in:trash subject:${messageSubject}</query>
			</SearchRequest>`, account1AuthToken
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
        assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
        const searchMessages = searchRes.SearchResponse?.m
            || searchRes.SearchResponse?.c;
        const searchMsg = Array.isArray(searchMessages)
            ? searchMessages : searchMessages ? [searchMessages] : [];
        assert.isAbove(searchMsg.length, 0, 'Should find mail in trash');
        const trashMsgId = searchMsg[0]?.id || searchMsg[0]?.m?.[0]?.id;

        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${trashMsgId}" />
			</GetMsgRequest>`, account1AuthToken
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not be a Fault');
        const zwcMsg = getMsgRes.GetMsgResponse?.m;
        const zwcMsgObj = Array.isArray(zwcMsg) ? zwcMsg[0] : zwcMsg;
        assert.include(zwcMsgObj.su, messageSubject, 'Subject should match');
    });


    it('Sanity | Hard delete email and verify it is not present in Trash in EWS client and verify on server', async () => {
        const messageSubject = `subject2${common.getUniqueString()}`;
        const messageContent = 'Message 2 test content';

        // Send mail from user1 to user2 (dumpster enabled) from Server
        const account1AuthToken = await soap.getAccountAuthToken(
            account1Email, accountPassword);
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
        assert.notExists(sendRes.Fault, 'SendMsgRequest should not be a Fault');

        // EWS: GetFolder for inbox of user2
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

        // EWS: SyncFolderItems on user2 Inbox
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
        const changes = syncMessage.Changes;
        const createItems = Array.isArray(changes?.Create)
            ? changes.Create : changes?.Create ? [changes.Create] : [];
        assert.isAbove(createItems.length, 0, 'Should have created items');
        const matchedItem = createItems.find(c => c?.Message?.Subject === messageSubject);
        assert.exists(matchedItem, 'Should find message matching subject');
        const mailItemId = matchedItem.Message.ItemId.$.Id;
        const mailItemChangeKey = matchedItem.Message.ItemId.$.ChangeKey;

        // EWS: GetItem to verify received mail
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
					<t:ItemId Id="${mailItemId}"
						ChangeKey="${mailItemChangeKey}" />
				</ItemIds>
			</GetItem>`,
            account2Email, accountPassword
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
        assert.equal(getItemMessage.Items?.Message?.Importance, 'Normal',
            'Importance should be Normal');

        // EWS: Hard delete using DeleteItem with SoftDelete for dumpster user
        const deleteRes = await ews.makeEWSRequest(
            `<DeleteItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				DeleteType="SoftDelete">
				<ItemIds>
					<t:ItemId Id="${mailItemId}"/>
				</ItemIds>
			</DeleteItem>`,
            account2Email, accountPassword
        );
        const deleteBody = ews.getBody(deleteRes);
        const deleteMsg = deleteBody.DeleteItemResponse
            ?.ResponseMessages?.DeleteItemResponseMessage
            || deleteBody.DeleteItemResponse
                ?.ResponseMessages?.GetItemResponseMessage;
        const deleteMessage = Array.isArray(deleteMsg)
            ? deleteMsg[0] : deleteMsg;
        assert.equal(deleteMessage.$.ResponseClass, 'Success',
            'DeleteItem should succeed');

        // EWS: Verify mail not in Trash
        const getTrashFolderRes = await ews.makeEWSRequest(
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
        const getTrashBody = ews.getBody(getTrashFolderRes);
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

        // ZWC: Verify mail not in inbox
        const account2AuthToken = await soap.getAccountAuthToken(
            account2Email, accountPassword);
        const searchInboxRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>in:inbox subject:${messageSubject}</query>
			</SearchRequest>`, account2AuthToken
        );
        assert.notExists(searchInboxRes.Fault,
            'SearchRequest should not be a Fault');
        const inboxMessages = searchInboxRes.SearchResponse?.m;
        assert.notExists(inboxMessages,
            'Mail should not be present in inbox');

        // ZWC: Verify mail not in trash
        const searchTrashRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="conversation"
				sortBy="dateDesc" offset="0" limit="25">
				<query>in:trash subject:${messageSubject}</query>
			</SearchRequest>`, account2AuthToken
        );
        assert.notExists(searchTrashRes.Fault,
            'SearchRequest should not be a Fault');
        const trashMessages = searchTrashRes.SearchResponse?.m;
        assert.notExists(trashMessages,
            'Mail should not be present in trash');

        // ZWC: Verify mail is in Dumpster
        const searchDumpsterRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="conversation"
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
