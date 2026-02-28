import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Bug 105034', function () {
    this.timeout(120 * 1000);
    let adminAuthToken, account1Email, account2Email, account3Email;
    let account1Password, listName;

    before(async function () {
        await main.before(this.ctx);
        adminAuthToken = await soap.getAdminAuthToken();
        account1Password = 'test123';

        account1Email = `ewstest1${common.getUniqueString()}@${config.testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${account1Password}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
        );

        account2Email = `ewstest2${common.getUniqueString()}@${config.testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${account1Password}</password>
			</CreateAccountRequest>`, adminAuthToken
        );

        account3Email = `ewstest3${common.getUniqueString()}@${config.testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${account1Password}</password>
			</CreateAccountRequest>`, adminAuthToken
        );
    });

    // Applicable zimbra versions
    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    // Tests
    it('Sanity | Create DL and add members to it Then send a sync gal to have the DL created in Gal', async () => {
        listName = `list1${common.getUniqueString()}@${config.testDomain}`;
        const createDlRes = await soap.makeSOAPEnvelopeAdmin(
            `<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${listName}</name>
				<a n="description">A test distribution list</a>
				<a n="zimbraMailStatus">enabled</a>
			</CreateDistributionListRequest>`, adminAuthToken
        );
        assert.notExists(createDlRes.Fault, 'CreateDistributionList should not fault');
        const dlId = createDlRes.CreateDistributionListResponse.dl[0].id;

        // Add members
        const addMember1 = await soap.makeSOAPEnvelopeAdmin(
            `<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${account1Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
        );
        assert.notExists(addMember1.Fault, 'AddDistributionListMember1 should not fault');

        const addMember2 = await soap.makeSOAPEnvelopeAdmin(
            `<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${account2Email}</dlm>
			</AddDistributionListMemberRequest>`, adminAuthToken
        );
        assert.notExists(addMember2.Fault, 'AddDistributionListMember2 should not fault');

        // Grant sendToDistList right to account3
        const grantRes = await soap.makeSOAPEnvelopeAdmin(
            `<GrantRightRequest xmlns="urn:zimbraAdmin">
				<target type="dl" by="name">${listName}</target>
				<grantee type="usr" by="name">${account3Email}</grantee>
				<right>sendToDistList</right>
			</GrantRightRequest>`, adminAuthToken
        );
        assert.notExists(grantRes.Fault, 'GrantRight should not fault');
    });


    it('Sanity | Send a message to DL Login DL user on EWS client and verify expanding DL returns Name and Email address', async () => {
        // Send message to DL
        const account3AuthToken = await soap.getAccountAuthToken(
            account3Email, account1Password
        );
        await soap.makeSOAPEnvelopeAccount(
            `<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${listName}" />
					<e t="t" a="${account3Email}" />
					<su>sub1</su>
					<mp ct="text/plain">
						<content>cont 1</content>
					</mp>
				</m>
			</SendMsgRequest>`, account3AuthToken
        );

        await soap.waitFor(5000);

        // EWS: GetFolder inbox for account1
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
            account1Email, account1Password
        );
        const getFolderBody = ews.getBody(getFolderRes);
        const getFolderMsg = getFolderBody.GetFolderResponse
            .ResponseMessages.GetFolderResponseMessage;
        const folderMsg = Array.isArray(getFolderMsg) ? getFolderMsg[0] : getFolderMsg;
        assert.equal(folderMsg.$.ResponseClass, 'Success', 'GetFolder should succeed');
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
            account1Email, account1Password
        );
        const syncBody = ews.getBody(syncRes);
        const syncMsg = syncBody.SyncFolderItemsResponse
            .ResponseMessages.SyncFolderItemsResponseMessage;
        const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
        assert.equal(syncMessage.$.ResponseClass, 'Success',
            'SyncFolderItems should succeed');

        // EWS: GetItem
        const creates = Array.isArray(syncMessage.Changes.Create)
            ? syncMessage.Changes.Create : [syncMessage.Changes.Create];
        const matchedItem = creates.find(c => c?.Message?.Subject === messageSubject);
        assert.exists(matchedItem, "Should find message matching subject");
        const mailItemId = matchedItem.Message.ItemId.$.Id;
        const mailChangeKey = matchedItem.Message.ItemId.$.ChangeKey;

        const getItemRes = await ews.makeEWSRequest(
            `<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties />
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${mailItemId}" ChangeKey="${mailChangeKey}" />
				</ItemIds>
			</GetItem>`,
            account1Email, account1Password
        );
        const getItemBody = ews.getBody(getItemRes);
        const getItemMsg = getItemBody.GetItemResponse
            .ResponseMessages.GetItemResponseMessage;
        const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
        assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');

        // EWS: ExpandDL
        const expandRes = await ews.makeEWSRequest(
            `<ExpandDL xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<Mailbox>
					<t:EmailAddress>${listName}</t:EmailAddress>
				</Mailbox>
			</ExpandDL>`,
            account1Email, account1Password
        );
        const expandBody = ews.getBody(expandRes);
        const expandMsg = expandBody.ExpandDLResponse
            .ResponseMessages.ExpandDLResponseMessage;
        const expandMessage = Array.isArray(expandMsg) ? expandMsg[0] : expandMsg;
        assert.equal(expandMessage.$.ResponseClass, 'Success',
            'ExpandDL should succeed');

        // Verify DL members contain both account1 and account2
        const dlExpansion = expandMessage.DLExpansion;
        const mailboxes = Array.isArray(dlExpansion.Mailbox)
            ? dlExpansion.Mailbox : [dlExpansion.Mailbox];
        const emails = mailboxes.map(m => m.EmailAddress);
        assert.include(emails.join(','), account1Email,
            'DL expansion should contain account1 email');
        assert.include(emails.join(','), account2Email,
            'DL expansion should contain account2 email');
    });
});
