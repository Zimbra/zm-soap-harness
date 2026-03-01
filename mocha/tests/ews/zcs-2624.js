import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > ZCS-2624', function () {
	this.timeout(180 * 1000);
	let adminAuthToken, account1Email, account2Email, account3Email, accountPassword;
	let messageSubject;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;
		messageSubject = `subject1${common.getUniqueString()}`;

		account1Email = `ewszcs2624a${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account2Email = `ewszcs2624b${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		account3Email = `ewszcs2624c${common.getUniqueString()}@${config.testDomain}`;
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
	it('Sanity | Verify response of an attendee to instances of recurring meeting when new attendee added to the instances', async () => {
		const account2Username = account2Email.split('@')[0];
		const account3Username = account3Email.split('@')[0];
		const createRes = await ews.makeEWSRequest(
			`<m:CreateItem xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
				SendMeetingInvitations="SendToAllAndSaveCopy">
				<m:SavedItemFolderId>
					<t:FolderId Id="10" />
				</m:SavedItemFolderId>
				<m:Items>
					<t:CalendarItem>
						<t:Subject>${messageSubject}</t:Subject>
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:UID>131F747D-DAB7-4A67-88A6-AA1BA877B987</t:UID>
						<t:Start>2018-10-10T13:30:00+07:00</t:Start>
						<t:End>2018-10-10T14:00:00+07:00</t:End>
						<t:IsAllDayEvent>false</t:IsAllDayEvent>
						<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
						<t:Location>Dgdgfd</t:Location>
						<t:IsResponseRequested>true</t:IsResponseRequested>
						<t:RequiredAttendees>
							<t:Attendee>
								<t:Mailbox>
									<t:Name>${account2Username}</t:Name>
									<t:EmailAddress>${account2Email}</t:EmailAddress>
								</t:Mailbox>
							</t:Attendee>
						</t:RequiredAttendees>
						<t:Recurrence>
							<t:DailyRecurrence>
								<t:Interval>1</t:Interval>
							</t:DailyRecurrence>
							<t:EndDateRecurrence>
								<t:StartDate>2018-10-10</t:StartDate>
								<t:EndDate>2018-10-15</t:EndDate>
							</t:EndDateRecurrence>
						</t:Recurrence>
						<t:StartTimeZone Id="SE Asia Standard Time" />
						<t:EndTimeZone Id="SE Asia Standard Time" />
						<t:AllowNewTimeProposal>false</t:AllowNewTimeProposal>
					</t:CalendarItem>
				</m:Items>
			</m:CreateItem>`,
			account1Email, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;

		// Verify response
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem should succeed');

		await soap.waitFor(10000);

		// Authenticate account
		const account2AuthToken = await soap.getAccountAuthToken(account2Email, accountPassword);

		// Search for the item
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appt = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt[0] : searchRes.SearchResponse.appt;
		const invId = appt.invId;
		const compNum = appt.compNum || '0';
		const organizer = Array.isArray(appt.or) ? appt.or[0].a : appt.or.a;

		// Send send invite reply request
		const acceptRes = await soap.makeSOAPEnvelopeAccount(
			`<SendInviteReplyRequest xmlns="urn:zimbraMail"
				id="${invId}" compNum="${compNum}" verb="ACCEPT" updateOrganizer="TRUE">
				<m rt="r">
					<e t="t" a="${organizer}" />
					<su>Accept: ${messageSubject}</su>
					<mp ct="text/plain">
						<content>Accept: ${messageSubject}</content>
					</mp>
				</m>
			</SendInviteReplyRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(acceptRes.Fault, 'Response should not be a Fault');

		await soap.waitFor(10000);
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:Subject" />
					</t:AdditionalProperties>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="10" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>100</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success',
			'SyncFolderItems should succeed');
		const rawCreates = syncMessage.Changes?.Create;
		const creates = rawCreates ? (Array.isArray(rawCreates) ? rawCreates : [rawCreates]) : [];
		const rawUpdates = syncMessage.Changes?.Update;
		const updates = rawUpdates ? (Array.isArray(rawUpdates) ? rawUpdates : [rawUpdates]) : [];
		const allSyncItems = [...creates, ...updates];
		const calMatch = allSyncItems.find(c => c?.CalendarItem?.Subject === messageSubject
			|| c?.MeetingRequest?.Subject === messageSubject
			|| c?.CalendarItem || c?.MeetingRequest);
		const calItem = calMatch?.CalendarItem || calMatch?.MeetingRequest;
		assert.exists(calItem, 'Calendar item should be found in sync results');
		const cal02Id = calItem.ItemId.$.Id;
		const cal02ChangeKey = calItem.ItemId.$.ChangeKey;
		const getItemRes = await ews.makeEWSRequest(
			`<m:GetItem xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
				<m:ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</m:ItemShape>
				<m:ItemIds>
					<t:ItemId Id="${cal02Id}" ChangeKey="${cal02ChangeKey}" />
				</m:ItemIds>
			</m:GetItem>`,
			account1Email, accountPassword
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg = getItemBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const itemMsg = Array.isArray(getItemMsg) ? getItemMsg[0] : getItemMsg;
		assert.equal(itemMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		const updateRes = await ews.makeEWSRequest(
			`<m:UpdateItem xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				ConflictResolution="AutoResolve"
				SendMeetingInvitationsOrCancellations="SendToChangedAndSaveCopy">
				<m:ItemChanges>
					<t:ItemChange>
						<t:OccurrenceItemId RecurringMasterId="${cal02Id}"
							ChangeKey="${cal02ChangeKey}" InstanceIndex="2" />
						<t:Updates>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:RequiredAttendees" />
								<t:CalendarItem>
									<t:RequiredAttendees>
										<t:Attendee>
											<t:Mailbox>
												<t:Name>${account3Username}</t:Name>
												<t:EmailAddress>${account3Email}</t:EmailAddress>
											</t:Mailbox>
											<t:ResponseType>NoResponseReceived</t:ResponseType>
										</t:Attendee>
										<t:Attendee>
											<t:Mailbox>
												<t:Name>${account2Username}</t:Name>
												<t:EmailAddress>${account2Email}</t:EmailAddress>
											</t:Mailbox>
											<t:ResponseType>Accept</t:ResponseType>
										</t:Attendee>
									</t:RequiredAttendees>
								</t:CalendarItem>
							</t:SetItemField>
						</t:Updates>
					</t:ItemChange>
				</m:ItemChanges>
			</m:UpdateItem>`,
			account1Email, accountPassword
		);
		const updateBody = ews.getBody(updateRes);
		const updateMsg = updateBody.UpdateItemResponse
			.ResponseMessages.UpdateItemResponseMessage;
		const updateMessage = Array.isArray(updateMsg) ? updateMsg[0] : updateMsg;
		assert.equal(updateMessage.$.ResponseClass, 'Success',
			'UpdateItem should succeed');
		const updatedItem = updateMessage.Items?.CalendarItem || updateMessage.Items?.Message;
		const cal03Id = updatedItem.ItemId.$.Id;
		const cal03ChangeKey = updatedItem.ItemId.$.ChangeKey;

		await soap.waitFor(10000);

		// Authenticate account
		const account3AuthToken = await soap.getAccountAuthToken(account3Email, accountPassword);

		// Search for the item
		const searchRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${messageSubject}</query>
			</SearchRequest>`, account3AuthToken
		);

		// Verify response
		assert.notExists(searchRes3.Fault, 'Response should not be a Fault');
		assert.exists(searchRes3.SearchResponse.appt,
			'Account3 should receive the appointment');
		await soap.waitFor(10000);
		const getItem2Res = await ews.makeEWSRequest(
			`<m:GetItem xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
				<m:ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</m:ItemShape>
				<m:ItemIds>
					<t:ItemId Id="${cal03Id}" ChangeKey="${cal03ChangeKey}" />
				</m:ItemIds>
			</m:GetItem>`,
			account1Email, accountPassword
		);
		const getItem2Body = ews.getBody(getItem2Res);
		const getItem2Msg = getItem2Body.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const item2Msg = Array.isArray(getItem2Msg) ? getItem2Msg[0] : getItem2Msg;
		assert.equal(item2Msg.$.ResponseClass, 'Success', 'GetItem should succeed');
		const attendees = item2Msg.Items.CalendarItem?.RequiredAttendees?.Attendee;
		if (attendees) {
			const attendeeArray = Array.isArray(attendees) ? attendees : [attendees];
			const acct2Attendee = attendeeArray.find(
				a => a.Mailbox?.EmailAddress === account2Email
			);
			assert.exists(acct2Attendee, 'Account2 should be an attendee');
			const acct3Attendee = attendeeArray.find(
				a => a.Mailbox?.EmailAddress === account3Email
			);
			assert.exists(acct3Attendee, 'Account3 should be an attendee');
			const acceptedAttendee = attendeeArray.find(
				a => a.ResponseType === 'Accept'
			);
			assert.exists(acceptedAttendee, 'There should be an accepted attendee');
		}
	});
});
