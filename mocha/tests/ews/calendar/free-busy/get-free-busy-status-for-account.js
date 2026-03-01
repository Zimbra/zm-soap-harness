import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import ews from '../../../../framework/backend/ews.js';
import { main } from '../../../../pages/main.js';

describe('EWS > Calendar > FreeBusy > Get Free Busy Status For Account', function () {
	this.timeout(300 * 1000);
	let adminAuthToken, account1Email, account2Email, account3Email, accountPassword;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		const unique = common.getUniqueString();
		accountPassword = config.accountPassword;
		account1Email = `testAccount1.${unique}@${config.testDomain}`;
		account2Email = `testAccount2.${unique}@${config.testDomain}`;
		account3Email = `testAccount3.${unique}@${config.testDomain}`;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
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
	it('Sanity | Validate User Availability (Free, Busy) using EWS GetUserAvailabilityRequest', async () => {
		const unique = common.getUniqueString();
		const apptSubject = `BusySlot.${unique}`;

		const startTime = common.getXMLTime(60);
		const endTime = common.getXMLTime(90);
		const windowStart = common.getXMLTime(60);
		const windowEnd = common.getXMLTime(120);
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SaveOnly"
				SendMeetingInvitations="SendToAllAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="10" />
				</SavedItemFolderId>
				<Items>
					<t:CalendarItem>
						<t:Subject>${apptSubject}</t:Subject>
						<t:ReminderIsSet>false</t:ReminderIsSet>
						<t:Start>${startTime}</t:Start>
						<t:End>${endTime}</t:End>
						<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
						<t:RequiredAttendees>
							<t:Attendee>
								<t:Mailbox>
									<t:EmailAddress>${account3Email}</t:EmailAddress>
								</t:Mailbox>
							</t:Attendee>
						</t:RequiredAttendees>
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
			account2Email, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;

		// Verify response
		assert.equal(createMsg.$.ResponseClass, 'Success', 'CreateItem should succeed');
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="10" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>100</MaxChangesReturned>
			</SyncFolderItems>`,
			account2Email, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		assert.equal(syncMsg.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const windowStartWide = common.getXMLTime(0);
		const windowEndWide = common.getXMLTime(180);
		await common.delay(8000);

		let eventArr = [];
		for (let attempt = 0; attempt < 5; attempt++) {
			if (attempt > 0) await common.delay(15000);
			const freeBusyRes = await ews.makeEWSRequest(
				`<GetUserAvailabilityRequest
					xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
					<t:TimeZone xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
						<t:Bias>0</t:Bias>
						<t:StandardTime>
							<t:Bias>0</t:Bias>
							<t:Time>02:00:00</t:Time>
							<t:DayOrder>5</t:DayOrder>
							<t:Month>10</t:Month>
							<t:DayOfWeek>Sunday</t:DayOfWeek>
						</t:StandardTime>
						<t:DaylightTime>
							<t:Bias>0</t:Bias>
							<t:Time>02:00:00</t:Time>
							<t:DayOrder>1</t:DayOrder>
							<t:Month>4</t:Month>
							<t:DayOfWeek>Sunday</t:DayOfWeek>
						</t:DaylightTime>
					</t:TimeZone>
					<MailboxDataArray>
						<t:MailboxData
							xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
							<t:Email>
								<t:Address>${account2Email}</t:Address>
							</t:Email>
							<t:AttendeeType>Required</t:AttendeeType>
							<t:ExcludeConflicts>false</t:ExcludeConflicts>
						</t:MailboxData>
					</MailboxDataArray>
					<t:FreeBusyViewOptions
						xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
						<t:TimeWindow>
							<t:StartTime>${windowStartWide}</t:StartTime>
							<t:EndTime>${windowEndWide}</t:EndTime>
						</t:TimeWindow>
						<t:MergedFreeBusyIntervalInMinutes>30</t:MergedFreeBusyIntervalInMinutes>
						<t:RequestedView>Detailed</t:RequestedView>
					</t:FreeBusyViewOptions>
				</GetUserAvailabilityRequest>`,
				account1Email, accountPassword
			);
			const fbBody = ews.getBody(freeBusyRes);
			const fbResponse = fbBody.GetUserAvailabilityResponse;
			assert.exists(fbResponse, 'GetUserAvailabilityResponse should exist');

			const fbResponseMsg = fbResponse.FreeBusyResponseArray?.FreeBusyResponse;
			const fbMsg = Array.isArray(fbResponseMsg) ? fbResponseMsg[0] : fbResponseMsg;
			assert.equal(
				fbMsg.ResponseMessage?.$.ResponseClass, 'Success',
				'FreeBusyResponse should succeed'
			);

			const calendarEvents = fbMsg.FreeBusyView?.CalendarEventArray?.CalendarEvent;
			eventArr = Array.isArray(calendarEvents) ? calendarEvents : (calendarEvents && calendarEvents !== '' ? [calendarEvents] : []);
		}
		assert.isAbove(eventArr.length, 0, 'Should have at least one CalendarEvent (after retry)');

		const event = eventArr[0];
		assert.equal(event.BusyType, 'Busy', 'BusyType should be Busy');
		assert.exists(event.CalendarEventDetails, 'CalendarEventDetails should exist');
		assert.equal(
			event.CalendarEventDetails.IsMeeting, 'true',
			'IsMeeting should be true'
		);
		assert.equal(
			event.CalendarEventDetails.IsRecurring, 'false',
			'IsRecurring should be false'
		);
	});
});
