import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Bug ZCS-397', function () {
    this.timeout(120 * 1000);
    let adminAuthToken, account1Email, account2Email, account1Password;

    before(async function () {
        await main.before(this.ctx);
        adminAuthToken = await soap.getAdminAuthToken();
        account1Password = 'test123';

        const domainName = `zcs397${common.getUniqueString()}.com`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
			</CreateDomainRequest>`, adminAuthToken
        );

        account1Email = `zcs397user1${common.getUniqueString()}@${domainName}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${account1Password}</password>
				<a n="zimbraFeatureSMIMEEnabled">TRUE</a>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
        );

        account2Email = `zcs397user2${common.getUniqueString()}@${domainName}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${account1Password}</password>
				<a n="zimbraFeatureSMIMEEnabled">TRUE</a>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
        );

        // Send a mail from account1 to account2
        const account1AuthToken = await soap.getAccountAuthToken(account1Email, account1Password);
        await soap.makeSOAPEnvelopeAccount(
            `<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}" />
					<su>encrypt test</su>
					<mp ct="text/plain">
						<content>asd</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
        );
        await soap.waitFor(5000);
    });

    // Applicable zimbra versions
    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    // Tests
    it('Sanity | Send encrypted mail from zwc to ews client', async () => {
        // EWS: GetFolder inbox
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
            account2Email, account1Password
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

        // EWS: SyncFolderItems
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
            account2Email, account1Password
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

        // EWS: GetItem with MimeContent
        const getItemRes = await ews.makeEWSRequest(
            `<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:ExtendedFieldURI PropertyTag="0x10F4" PropertyType="Boolean" />
						<t:FieldURI FieldURI="item:Body" />
						<t:FieldURI FieldURI="item:Attachments" />
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="item:Size" />
						<t:FieldURI FieldURI="message:From" />
						<t:FieldURI FieldURI="item:MimeContent" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
            account2Email, account1Password
        );
        const getItemBody = ews.getBody(getItemRes);
        const getItemMsg = getItemBody.GetItemResponse
            .ResponseMessages.GetItemResponseMessage;
        const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
        assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
        assert.equal(itemMsg.Items.Message.Subject, 'encrypt test',
            'Subject should match');
        assert.exists(itemMsg.Items.Message.MimeContent,
            'MimeContent should be present');
    });
});
