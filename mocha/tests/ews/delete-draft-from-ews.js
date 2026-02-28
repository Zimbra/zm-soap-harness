import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Delete Draft From EWS', function () {
    this.timeout(120 * 1000);
    let adminAuthToken, accountEmail, accountPassword;

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
    it('Sanity | Create draft with subject and content in ZWC and sync on EWS client Delete same draft from EWS and sync on ZWC', async () => {
        const messageSubject = `subject${common.getUniqueString()}`;
        const messageContent = 'Message test content';

        // ZWC: Save draft
        const accountAuthToken = await soap.getAccountAuthToken(accountEmail, accountPassword);
        const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
            `<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<su>${messageSubject}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
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
        const mailItemId = creates[0].Message.ItemId.$.Id;
        const mailChangeKey = creates[0].Message.ItemId.$.ChangeKey;

        // EWS: GetItem to verify draft
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
        assert.include(itemMsg.Items.Message.Body._, messageContent,
            'Body should contain expected content');
        assert.equal(itemMsg.Items.Message.Importance, 'Normal',
            'Importance should be Normal');

        // EWS: MoveItem to Trash (Id=3) to delete the draft
        const moveRes = await ews.makeEWSRequest(
            `<MoveItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ToFolderId>
					<t:FolderId Id="3"/>
				</ToFolderId>
				<ItemIds>
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</MoveItem>`,
            accountEmail, accountPassword
        );
        const moveBody = ews.getBody(moveRes);
        const moveMsg = moveBody.MoveItemResponse
            .ResponseMessages.MoveItemResponseMessage;
        const moveMessage = Array.isArray(moveMsg) ? moveMsg[0] : moveMsg;
        assert.equal(moveMessage.$.ResponseClass, 'Success',
            'MoveItem to Trash should succeed');

        // EWS: SyncFolderItems on Trash to verify the draft landed there
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
            accountEmail, accountPassword
        );
        const syncTrashBody = ews.getBody(syncTrashRes);
        const syncTrashMsg = syncTrashBody.SyncFolderItemsResponse
            .ResponseMessages.SyncFolderItemsResponseMessage;
        const syncTrashMessage = Array.isArray(syncTrashMsg) ? syncTrashMsg[0] : syncTrashMsg;
        assert.equal(syncTrashMessage.$.ResponseClass, 'Success',
            'SyncFolderItems on Trash should succeed');

        // ZWC: Verify draft is in Trash
        const searchRes = await soap.makeSOAPEnvelopeAccount(
            `<SearchRequest xmlns="urn:zimbraMail" types="message"
				sortBy="dateDesc" offset="0" limit="25">
				<query>in:trash subject:${messageSubject}</query>
			</SearchRequest>`, accountAuthToken
        );
        assert.notExists(searchRes.Fault, 'SearchRequest should not be a Fault');
        assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

        // GetMsg to verify content
        const messages = Array.isArray(searchRes.SearchResponse.m)
            ? searchRes.SearchResponse.m : searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : [];
        assert.isAbove(messages.length, 0, 'Should find message');
        const msgId = messages[0].id;

        const getMsgRes = await soap.makeSOAPEnvelopeAccount(
            `<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" />
			</GetMsgRequest>`, accountAuthToken
        );
        assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not be a Fault');
        const msg = getMsgRes.GetMsgResponse.m;
        const msgObj = Array.isArray(msg) ? msg[0] : msg;
        assert.include(msgObj.su, messageSubject, 'Subject should match');
        assert.include(msgObj.fr || '', messageContent,
            'Fragment should contain expected content');
    });
});
