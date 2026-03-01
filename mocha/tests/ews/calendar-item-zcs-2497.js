import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > CalendarItem ZCS-2497', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, account1Email, account1Password;
	let account2Email, account2Password;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Password = config.accountPassword;
		account2Password = config.accountPassword;

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
	it('Sanity | NPE should not be thrown for meeting request with reminder not set', async () => {
		const messageSubject = `subject1${common.getUniqueString()}`;
		const createRes = await ews.makeEWSRequest(
			`<CreateItem
				xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				SendMeetingInvitations="SendToAllAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="10" />
				</SavedItemFolderId>
				<Items>
					<t:CalendarItem>
						<t:Subject>${messageSubject}</t:Subject>
						<t:ReminderIsSet>false</t:ReminderIsSet>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyName="CalendarTimeZone"
								PropertySetId="A7B529B5-4B75-47A7-A24F-20743D6C55CD"
								PropertyType="String" />
							<t:Value>Asia/Kolkata</t:Value>
						</t:ExtendedProperty>
						<t:UID>147EA834-D714-429E-94D7-80A1A975F61E</t:UID>
						<t:Start>2018-08-30T09:00:00</t:Start>
						<t:End>2018-08-30T10:00:00</t:End>
						<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
						<t:RequiredAttendees>
							<t:Attendee>
								<t:Mailbox>
									<t:Name>${account2Email.split('@')[0]}</t:Name>
									<t:EmailAddress>${account2Email}</t:EmailAddress>
								</t:Mailbox>
							</t:Attendee>
						</t:RequiredAttendees>
						<t:MeetingTimeZone TimeZoneName="India Standard Time" />
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
			account1Email, account1Password
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;

		// Verify response
		assert.equal(createMessage.$.ResponseClass, 'Success', 'CreateItem should succeed');
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
			account1Email, account1Password
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const calItemId = creates[0].CalendarItem.ItemId.$.Id;
		const calChangeKey = creates[0].CalendarItem.ItemId.$.ChangeKey;
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>Default</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
					<t:BodyType>Text</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:ReminderIsSet" />
						<t:FieldURI FieldURI="item:ReminderMinutesBeforeStart" />
						<t:FieldURI FieldURI="item:ReminderDueBy" />
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
		assert.equal(itemMsg.Items.CalendarItem.Subject, messageSubject,
			'Subject should match');
		assert.equal(itemMsg.Items.CalendarItem.ReminderIsSet, 'false',
			'ReminderIsSet should be false');
	});


	it('Sanity | NPE should not be thrown for a recurring meeting request with reminder not set', async () => {
		const messageSubject = `subject2${common.getUniqueString()}`;
		const createRes = await ews.makeEWSRequest(
			`<CreateItem
				xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				SendMeetingInvitations="SendToAllAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="10" />
				</SavedItemFolderId>
				<Items>
					<t:CalendarItem>
						<t:Subject>${messageSubject}</t:Subject>
						<t:ReminderIsSet>false</t:ReminderIsSet>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyName="CalendarTimeZone"
								PropertySetId="A7B529B5-4B75-47A7-A24F-20743D6C55CD"
								PropertyType="String" />
							<t:Value>Asia/Kolkata</t:Value>
						</t:ExtendedProperty>
						<t:UID>147EA834-D714-429E-94D7-80A1A975F61E</t:UID>
						<t:Start>2018-08-30T09:00:00</t:Start>
						<t:End>2018-08-30T10:00:00</t:End>
						<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
						<t:RequiredAttendees>
							<t:Attendee>
								<t:Mailbox>
									<t:Name>${account2Email.split('@')[0]}</t:Name>
									<t:EmailAddress>${account2Email}</t:EmailAddress>
								</t:Mailbox>
							</t:Attendee>
						</t:RequiredAttendees>
						<t:Recurrence>
							<t:DailyRecurrence>
								<t:Interval>1</t:Interval>
							</t:DailyRecurrence>
							<t:NumberedRecurrence>
								<t:StartDate>2018-08-30</t:StartDate>
								<t:NumberOfOccurrences>3</t:NumberOfOccurrences>
							</t:NumberedRecurrence>
						</t:Recurrence>
						<t:MeetingTimeZone TimeZoneName="India Standard Time" />
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
			account1Email, account1Password
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;

		// Verify response
		assert.equal(createMessage.$.ResponseClass, 'Success', 'CreateItem should succeed');
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
			account1Email, account1Password
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		const syncMessage = Array.isArray(syncMsg) ? syncMsg[0] : syncMsg;
		assert.equal(syncMessage.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const calItemId = creates[creates.length - 1].CalendarItem.ItemId.$.Id;
		const calChangeKey = creates[creates.length - 1].CalendarItem.ItemId.$.ChangeKey;
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>Default</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
					<t:BodyType>Text</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:ReminderIsSet" />
						<t:FieldURI FieldURI="item:ReminderMinutesBeforeStart" />
						<t:FieldURI FieldURI="item:ReminderDueBy" />
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
		assert.equal(itemMsg.Items.CalendarItem.Subject, messageSubject,
			'Subject should match');
		assert.equal(itemMsg.Items.CalendarItem.ReminderIsSet, 'false',
			'ReminderIsSet should be false');
	});
});
