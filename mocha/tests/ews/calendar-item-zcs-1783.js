import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > CalendarItem ZCS-1783', function () {
    this.timeout(120 * 1000);
    let adminAuthToken, account1Email, account1Password;
    let account2Email, account2Password;

    before(async function () {
        await main.before(this.ctx);
        adminAuthToken = await soap.getAdminAuthToken();
        account1Password = 'test123';
        account2Password = 'test123';

        const account1Name = `ewstest1${common.getUniqueString()}@${config.testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${account1Password}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
        );
        account1Email = account1Name;

        const account2Name = `ewstest2${common.getUniqueString()}@${config.testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${account2Password}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
        );
        account2Email = account2Name;
    });

    // Applicable zimbra versions
    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    // Tests
    it('Sanity | Updating an instance of a meeting request should not send cancellation mail for already deleted instances', async () => {
        const messageSubject = `subject${common.getUniqueString()}`;

        // EWS: CreateItem — recurring daily meeting for 3 days
        const createRes = await ews.makeEWSRequest(
            `<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SaveOnly" SendMeetingInvitations="SendToAllAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="10" />
				</SavedItemFolderId>
				<Items>
					<t:CalendarItem>
						<t:Subject>${messageSubject}</t:Subject>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Body BodyType="HTML">Text for body</t:Body>
						<t:Importance>Normal</t:Importance>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI DistinguishedPropertySetId="Common"
								PropertyId="34144" PropertyType="SystemTime" />
							<t:Value>2018-08-22T02:15:00Z</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI DistinguishedPropertySetId="Common"
								PropertyId="34050" PropertyType="SystemTime" />
							<t:Value>2018-08-22T02:30:00Z</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI DistinguishedPropertySetId="Common"
								PropertyId="34051" PropertyType="Boolean" />
							<t:Value>true</t:Value>
						</t:ExtendedProperty>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI DistinguishedPropertySetId="Common"
								PropertyId="34049" PropertyType="Integer" />
							<t:Value>15</t:Value>
						</t:ExtendedProperty>
						<t:UID>2CD43BA2-56DB-42D8-BCB1-A3F54B2191A0</t:UID>
						<t:Start>2018-08-22T08:00:00+05:30</t:Start>
						<t:End>2018-08-22T08:30:00+05:30</t:End>
						<t:IsAllDayEvent>false</t:IsAllDayEvent>
						<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
						<t:IsResponseRequested>true</t:IsResponseRequested>
						<t:RequiredAttendees>
							<t:Attendee>
								<t:Mailbox>
									<t:Name>${account2Email.split('@')[0]}</t:Name>
									<t:EmailAddress>${account2Email}</t:EmailAddress>
								</t:Mailbox>
								<t:ResponseType>NoResponseReceived</t:ResponseType>
							</t:Attendee>
						</t:RequiredAttendees>
						<t:Recurrence>
							<t:DailyRecurrence>
								<t:Interval>1</t:Interval>
							</t:DailyRecurrence>
							<t:NumberedRecurrence>
								<t:StartDate>2018-08-22</t:StartDate>
								<t:NumberOfOccurrences>3</t:NumberOfOccurrences>
							</t:NumberedRecurrence>
						</t:Recurrence>
						<t:StartTimeZone Id="Sri Lanka Standard Time" />
						<t:EndTimeZone Id="Sri Lanka Standard Time" />
						<t:AllowNewTimeProposal>false</t:AllowNewTimeProposal>
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
            account1Email, account1Password
        );
        const createBody = ews.getBody(createRes);
        const createMsg = createBody.CreateItemResponse
            .ResponseMessages.CreateItemResponseMessage;
        const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
        assert.equal(createMessage.$.ResponseClass, 'Success', 'CreateItem should succeed');
        const calId = createMessage.Items.CalendarItem.ItemId.$.Id;

        // EWS: SyncFolderItems for calendar folder (folder 10)
        const syncRes1 = await ews.makeEWSRequest(
            `<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="10" />
				</SyncFolderId>
				<SyncState></SyncState>
				<Ignore>
					<t:ItemId Id="${calId}" ChangeKey="${createMessage.Items.CalendarItem.ItemId.$.ChangeKey}" />
				</Ignore>
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
            account1Email, account1Password
        );
        const syncBody1 = ews.getBody(syncRes1);
        const syncMsg1 = syncBody1.SyncFolderItemsResponse
            .ResponseMessages.SyncFolderItemsResponseMessage;
        const syncMessage1 = Array.isArray(syncMsg1) ? syncMsg1[0] : syncMsg1;
        assert.equal(syncMessage1.$.ResponseClass, 'Success',
            'SyncFolderItems for calendar should succeed');

        // EWS: SyncFolderItems for sent items folder (folder 5)
        const syncRes1b = await ews.makeEWSRequest(
            `<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
					</t:AdditionalProperties>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="5" />
				</SyncFolderId>
				<SyncState></SyncState>
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
				<SyncScope>NormalAndAssociatedItems</SyncScope>
			</SyncFolderItems>`,
            account1Email, account1Password
        );
        const syncBody1b = ews.getBody(syncRes1b);
        const syncMsg1b = syncBody1b.SyncFolderItemsResponse
            .ResponseMessages.SyncFolderItemsResponseMessage;
        const syncMessage1b = Array.isArray(syncMsg1b) ? syncMsg1b[0] : syncMsg1b;
        assert.equal(syncMessage1b.$.ResponseClass, 'Success',
            'SyncFolderItems for sent items should succeed');
        const syncState5_1 = syncMessage1b.SyncState;

        // EWS: GetItem for 1st occurrence to cancel
        const getOccRes = await ews.makeEWSRequest(
            `<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:BodyType>Text</t:BodyType>
				</ItemShape>
				<ItemIds>
					<t:OccurrenceItemId RecurringMasterId="${calId}" InstanceIndex="1" />
				</ItemIds>
			</GetItem>`,
            account1Email, account1Password
        );
        const getOccBody = ews.getBody(getOccRes);
        const getOccMsg = getOccBody.GetItemResponse
            .ResponseMessages.GetItemResponseMessage;
        const occMsg = Array.isArray(getOccMsg) ? getOccMsg[0] : getOccMsg;
        assert.equal(occMsg.$.ResponseClass, 'Success', 'GetItem for occurrence should succeed');
        const occ1Id = occMsg.Items.CalendarItem.ItemId.$.Id;
        const occ1Ck = occMsg.Items.CalendarItem.ItemId.$.ChangeKey;

        // EWS: CancelCalendarItem for 1st instance
        const cancelRes = await ews.makeEWSRequest(
            `<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy" SendMeetingInvitations="SendToAllAndSaveCopy">
				<Items>
					<t:CancelCalendarItem>
						<t:ReferenceItemId Id="${occ1Id}" ChangeKey="${occ1Ck}" />
					</t:CancelCalendarItem>
				</Items>
			</CreateItem>`,
            account1Email, account1Password
        );
        const cancelBody = ews.getBody(cancelRes);
        const cancelMsg = cancelBody.CreateItemResponse
            .ResponseMessages.CreateItemResponseMessage;
        const cancelMessage = Array.isArray(cancelMsg) ? cancelMsg[0] : cancelMsg;
        assert.equal(cancelMessage.$.ResponseClass, 'Success',
            'CancelCalendarItem should succeed');

        // EWS: SyncFolderItems calendar folder again
        const syncRes2 = await ews.makeEWSRequest(
            `<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="10" />
				</SyncFolderId>
				<SyncState>${syncMessage1.SyncState}</SyncState>
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
            account1Email, account1Password
        );
        const syncBody2 = ews.getBody(syncRes2);
        const syncMsg2 = syncBody2.SyncFolderItemsResponse
            .ResponseMessages.SyncFolderItemsResponseMessage;
        const syncMessage2 = Array.isArray(syncMsg2) ? syncMsg2[0] : syncMsg2;
        assert.equal(syncMessage2.$.ResponseClass, 'Success',
            'SyncFolderItems after cancel should succeed');
        const sync10Ck2 = syncMessage2.SyncState;

        // EWS: SyncFolderItems sent folder again
        const syncRes2b = await ews.makeEWSRequest(
            `<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
					</t:AdditionalProperties>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="5" />
				</SyncFolderId>
				<SyncState>${syncState5_1}</SyncState>
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
				<SyncScope>NormalAndAssociatedItems</SyncScope>
			</SyncFolderItems>`,
            account1Email, account1Password
        );
        const syncBody2b = ews.getBody(syncRes2b);
        const syncMsg2b = syncBody2b.SyncFolderItemsResponse
            .ResponseMessages.SyncFolderItemsResponseMessage;
        const syncMessage2b = Array.isArray(syncMsg2b) ? syncMsg2b[0] : syncMsg2b;
        assert.equal(syncMessage2b.$.ResponseClass, 'Success',
            'SyncFolderItems sent after cancel should succeed');
        const syncState5_2 = syncMessage2b.SyncState;

        // EWS: UpdateItem — update 2nd instance notes
        const updateRes = await ews.makeEWSRequest(
            `<UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				ConflictResolution="AutoResolve"
				SendMeetingInvitationsOrCancellations="SendToAllAndSaveCopy">
				<ItemChanges>
					<t:ItemChange>
						<t:OccurrenceItemId RecurringMasterId="${calId}"
							ChangeKey="${syncMessage2.Changes ? (Array.isArray(syncMessage2.Changes.Update) ?
                syncMessage2.Changes.Update[0].CalendarItem?.ItemId?.$.ChangeKey ||
                syncMessage2.Changes.Delete?.[0]?.ItemId?.$.ChangeKey : '') : ''}"
							InstanceIndex="2" />
						<t:Updates>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Subject" />
								<t:CalendarItem>
									<t:Subject>${messageSubject}</t:Subject>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Body" />
								<t:CalendarItem>
									<t:Body BodyType="HTML">Text for body updated</t:Body>
								</t:CalendarItem>
							</t:SetItemField>
						</t:Updates>
					</t:ItemChange>
				</ItemChanges>
			</UpdateItem>`,
            account1Email, account1Password
        );
        const updateBody = ews.getBody(updateRes);
        const updateMsg = updateBody.UpdateItemResponse
            .ResponseMessages.UpdateItemResponseMessage;
        const updateMessage = Array.isArray(updateMsg) ? updateMsg[0] : updateMsg;
        assert.equal(updateMessage.$.ResponseClass, 'Success', 'UpdateItem should succeed');
        const updatedCk = updateMessage.Items.CalendarItem.ItemId.$.ChangeKey;

        // EWS: DeleteItem — delete 1st instance
        const deleteRes = await ews.makeEWSRequest(
            `<DeleteItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				DeleteType="SoftDelete" SendMeetingCancellations="SendToAllAndSaveCopy">
				<ItemIds>
					<t:OccurrenceItemId RecurringMasterId="${calId}" InstanceIndex="1" />
				</ItemIds>
			</DeleteItem>`,
            account1Email, account1Password
        );
        const deleteBody = ews.getBody(deleteRes);
        assert.exists(deleteBody.DeleteItemResponse, 'DeleteItemResponse should exist');

        // EWS: SyncFolderItems calendar folder
        const syncRes3 = await ews.makeEWSRequest(
            `<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="10" />
				</SyncFolderId>
				<SyncState>${sync10Ck2}</SyncState>
				<Ignore>
					<t:ItemId Id="${calId}" ChangeKey="${updatedCk}" />
				</Ignore>
				<MaxChangesReturned>512</MaxChangesReturned>
			</SyncFolderItems>`,
            account1Email, account1Password
        );
        const syncBody3 = ews.getBody(syncRes3);
        const syncMsg3 = syncBody3.SyncFolderItemsResponse
            .ResponseMessages.SyncFolderItemsResponseMessage;
        const syncMessage3 = Array.isArray(syncMsg3) ? syncMsg3[0] : syncMsg3;
        assert.equal(syncMessage3.$.ResponseClass, 'Success',
            'SyncFolderItems after update should succeed');

        // EWS: SyncFolderItems sent folder — verify no cancellation for deleted instance
        const syncRes3b = await ews.makeEWSRequest(
            `<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="item:DisplayTo" />
					</t:AdditionalProperties>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="5" />
				</SyncFolderId>
				<SyncState>${syncState5_2}</SyncState>
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
				<SyncScope>NormalAndAssociatedItems</SyncScope>
			</SyncFolderItems>`,
            account1Email, account1Password
        );
        const syncBody3b = ews.getBody(syncRes3b);
        const syncMsg3b = syncBody3b.SyncFolderItemsResponse
            .ResponseMessages.SyncFolderItemsResponseMessage;
        const syncMessage3b = Array.isArray(syncMsg3b) ? syncMsg3b[0] : syncMsg3b;
        assert.equal(syncMessage3b.$.ResponseClass, 'Success',
            'SyncFolderItems sent after update should succeed');

        // Verify: first created item subject matches, no cancellation for deleted instance
        if (syncMessage3b.Changes && syncMessage3b.Changes.Create) {
            const sentCreates = Array.isArray(syncMessage3b.Changes.Create)
                ? syncMessage3b.Changes.Create : [syncMessage3b.Changes.Create];
            const firstSubject = sentCreates[0]?.Message?.Subject || sentCreates[0]?.CalendarItem?.Subject;
            if (firstSubject) {
                assert.include(firstSubject, messageSubject,
                    'First sent item should have updated subject');
            }
            // Verify no cancellation mail for already deleted 1st instance
            if (sentCreates.length > 1) {
                const secondSubject = sentCreates[1]?.Message?.Subject ||
                    sentCreates[1]?.CalendarItem?.Subject || '';
                assert.notInclude(secondSubject, `Cancelled: ${messageSubject}`,
                    'Should not have cancellation mail for deleted instance');
            }
        }
    });
});
