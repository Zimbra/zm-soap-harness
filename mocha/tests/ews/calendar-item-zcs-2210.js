import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import ews from '../../framework/backend/ews.js';
import { main } from '../../pages/main.js';

describe('EWS > CalendarItem ZCS-2210', function () {
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
	it('Sanity | Create a meeting request with no UID specified', async () => {
		const messageSubject = `subject${common.getUniqueString()}`;
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
						<t:Start>2018-08-22T07:00:00+05:30</t:Start>
						<t:End>2018-08-22T07:30:00+05:30</t:End>
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
						<t:FieldURI FieldURI="calendar:UID" />
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
		assert.exists(itemMsg.Items.CalendarItem.UID,
			'UID should be auto-generated when not specified');
	});


	it('Sanity | Create a meeting request with random UID specified', async () => {
		const messageSubject = `subject1.${common.getUniqueString()}`;
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
						<t:UID>Random string</t:UID>
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
						<t:FieldURI FieldURI="calendar:UID" />
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
		assert.equal(itemMsg.Items.CalendarItem.UID, 'Random string',
			'UID should match the random string provided');
	});


	it('Sanity | Create a meeting request with UID field empty', async () => {
		const messageSubject = `subject2.${common.getUniqueString()}`;
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
						<t:UID></t:UID>
						<t:Start>2018-08-22T09:00:00+05:30</t:Start>
						<t:End>2018-08-22T09:30:00+05:30</t:End>
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
						<t:FieldURI FieldURI="calendar:UID" />
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
		assert.exists(itemMsg.Items.CalendarItem.UID,
			'UID should be auto-generated even when provided empty');
	});
});
