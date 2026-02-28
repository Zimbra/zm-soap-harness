import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > Bug 106156', function () {
    this.timeout(180 * 1000);
    let adminAuthToken, account1Email, account1Password;

    before(async function () {
        await main.before(this.ctx);
        adminAuthToken = await soap.getAdminAuthToken();
        account1Password = 'test123';

        account1Email = `ewstest${common.getUniqueString()}@${config.testDomain}`;
        await soap.makeSOAPEnvelopeAdmin(
            `<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${account1Password}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
        );
    });

    // Applicable zimbra versions
    if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
        return;
    }

    // Tests
    it('Sanity | Import an appointment using uploadservlet on ZWC of account 1 user and verify on EWS client the interval is set to 1 in response', async () => {
        // Create an appointment on ZWC with recurrence
        const account1AuthToken = await soap.getAccountAuthToken(
            account1Email, account1Password
        );
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 1);
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);
        const startStr = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endStr = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="Recurring Appt Test1" status="CONF" fb="B"
							class="PUB" transp="O">
							<s d="${startStr}" />
							<e d="${endStr}" />
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1" />
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>Recurring Appt Test1</su>
					<mp ct="text/plain">
						<content>Test recurring daily</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
        );

        // EWS: GetFolder calendar
        const getFolderRes = await ews.makeEWSRequest(
            `<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="calendar">
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
        const calendarId = folderMsg.Folders.CalendarFolder.FolderId.$.Id;

        // EWS: SyncFolderItems for calendar
        const syncRes = await ews.makeEWSRequest(
            `<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${calendarId}" />
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
        const creates = Array.isArray(syncMessage.Changes.Create)
            ? syncMessage.Changes.Create : [syncMessage.Changes.Create];
        const calItemId = creates[0].CalendarItem.ItemId.$.Id;
        const calChangeKey = creates[0].CalendarItem.ItemId.$.ChangeKey;

        // EWS: GetItem with Recurrence
        const getItemRes = await ews.makeEWSRequest(
            `<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>Default</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="calendar:Recurrence" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${calItemId}" ChangeKey="${calChangeKey}" />
				</ItemIds>
			</GetItem>`,
            account1Email, account1Password
        );
        const getItemBody = ews.getBody(getItemRes);
        const getItemMsg = getItemBody.GetItemResponse
            .ResponseMessages.GetItemResponseMessage;
        const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
        assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
        const calendarItem = itemMsg.Items.CalendarItem;
        assert.exists(calendarItem.Recurrence, 'Recurrence should exist');
        const interval = calendarItem.Recurrence?.DailyRecurrence?.Interval
            || calendarItem.Recurrence?.RelativeMonthlyRecurrence?.Interval
            || calendarItem.Recurrence?.AbsoluteMonthlyRecurrence?.Interval;
        assert.equal(interval, '1', 'Interval should be 1');
    });


    it('Sanity | Import an appointment with monthly interval set to 3 months using uploadservlet on ZWC of account 1 user Then modify the ics to have interval of 1 month', async () => {
        // Create appointment with 3-month recurrence
        const account1AuthToken = await soap.getAccountAuthToken(
            account1Email, account1Password
        );
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 2);
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);
        const startStr = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endStr = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const createRes = await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="3Monthly Recurring Test2" status="CONF" fb="B"
							class="PUB" transp="O">
							<s d="${startStr}" />
							<e d="${endStr}" />
							<recur>
								<add>
									<rule freq="MON">
										<interval ival="3" />
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>3Monthly Recurring Test2</su>
					<mp ct="text/plain">
						<content>Test recurring 3-monthly</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
        );
        assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');

        // EWS: SyncFolderItems for calendar
        const getFolderRes = await ews.makeEWSRequest(
            `<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="calendar">
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
        const calendarId = folderMsg.Folders.CalendarFolder.FolderId.$.Id;

        const syncRes = await ews.makeEWSRequest(
            `<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${calendarId}" />
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
        const creates = Array.isArray(syncMessage.Changes.Create)
            ? syncMessage.Changes.Create : [syncMessage.Changes.Create];

        // Get the latest calendar item (should be our 3-monthly one)
        const latestCreate = creates[creates.length - 1];
        const calItemId = latestCreate.CalendarItem.ItemId.$.Id;
        const calChangeKey = latestCreate.CalendarItem.ItemId.$.ChangeKey;

        // EWS: GetItem with Recurrence
        const getItemRes = await ews.makeEWSRequest(
            `<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>Default</t:BaseShape>
					<t:BodyType>Best</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="calendar:Recurrence" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${calItemId}" ChangeKey="${calChangeKey}" />
				</ItemIds>
			</GetItem>`,
            account1Email, account1Password
        );
        const getItemBody = ews.getBody(getItemRes);
        const getItemMsg = getItemBody.GetItemResponse
            .ResponseMessages.GetItemResponseMessage;
        const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
        assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
        const calendarItem = itemMsg.Items.CalendarItem;
        assert.exists(calendarItem.Recurrence, 'Recurrence should exist');
        const interval = calendarItem.Recurrence?.RelativeMonthlyRecurrence?.Interval
            || calendarItem.Recurrence?.AbsoluteMonthlyRecurrence?.Interval;
        assert.equal(interval, '3', 'Interval should be 3');
    });


    it('Sanity | Import an single appointment using uploadservlet on ZWC of account 1 user Then modify the ics to have recurring meeting with interval of 1 month and recurrence pattern changed for two icss', async () => {
        // Create a single (non-recurring) appointment
        const account1AuthToken = await soap.getAccountAuthToken(
            account1Email, account1Password
        );
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 3);
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);
        const startStr = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endStr = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        await soap.makeSOAPEnvelopeAccount(
            `<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="Single Appt Test4" status="CONF" fb="B"
							class="PUB" transp="O">
							<s d="${startStr}" />
							<e d="${endStr}" />
						</comp>
					</inv>
					<su>Single Appt Test4</su>
					<mp ct="text/plain">
						<content>Single appointment test</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
        );

        // EWS: GetFolder calendar
        const getFolderRes = await ews.makeEWSRequest(
            `<GetFolder xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<FolderShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</FolderShape>
				<FolderIds>
					<t:DistinguishedFolderId Id="calendar">
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
        const calendarId = folderMsg.Folders.CalendarFolder.FolderId.$.Id;

        // EWS: SyncFolderItems
        const syncRes = await ews.makeEWSRequest(
            `<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="${calendarId}" />
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
        const creates = Array.isArray(syncMessage.Changes.Create)
            ? syncMessage.Changes.Create : [syncMessage.Changes.Create];
        const latestCreate = creates[creates.length - 1];
        const calItemId = latestCreate.CalendarItem.ItemId.$.Id;
        const calChangeKey = latestCreate.CalendarItem.ItemId.$.ChangeKey;

        // EWS: GetItem - verify no Interval (single appointment)
        const getItemRes = await ews.makeEWSRequest(
            `<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>Default</t:BaseShape>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
						<t:FieldURI FieldURI="calendar:Recurrence" />
					</t:AdditionalProperties>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${calItemId}" ChangeKey="${calChangeKey}" />
				</ItemIds>
			</GetItem>`,
            account1Email, account1Password
        );
        const getItemBody = ews.getBody(getItemRes);
        const getItemMsg = getItemBody.GetItemResponse
            .ResponseMessages.GetItemResponseMessage;
        const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
        assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
        const calendarItem = itemMsg.Items.CalendarItem;
        // Single appointment should not have Recurrence/Interval
        const hasRecurrence = calendarItem.Recurrence !== undefined
            && calendarItem.Recurrence !== null;
        if (hasRecurrence) {
            const interval = calendarItem.Recurrence?.DailyRecurrence?.Interval
                || calendarItem.Recurrence?.RelativeMonthlyRecurrence?.Interval
                || calendarItem.Recurrence?.AbsoluteMonthlyRecurrence?.Interval;
            assert.notExists(interval,
                'Single appointment should not have Interval');
        }
    });
});
