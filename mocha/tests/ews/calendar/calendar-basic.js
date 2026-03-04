import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import ews from '../../../framework/backend/ews.js';
import { main } from '../../../pages/main.js';

describe('EWS > Calendar > Calendar Basic', function () {
	this.timeout(300 * 1000);
	let account1Email, account2Email, account3Email, accountPassword;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();
		accountPassword = config.accountPassword;
		const unique = common.getUniqueString();

		account1Email = `ewscalbasica${unique}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		account2Email = `ewscalbasicb${unique}@${config.testDomain}`;
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		account3Email = `ewscalbasicc${unique}@${config.testDomain}`;
		const createAcctRes3 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes3.Fault, 'CreateAccountRequest should not fault');
		const acctInfo3 = Array.isArray(createAcctRes3.CreateAccountResponse.account)
			? createAcctRes3.CreateAccountResponse.account[0]
			: createAcctRes3.CreateAccountResponse.account;
		assert.exists(acctInfo3.id, 'Account ID should exist');
		const host3 = acctInfo3.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host3, 'zimbraMailHost should exist');
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
	it('Sanity | Create a simple calendar appointment from ZWC and sync on EWS client', async () => {
		const apptSubject = `subject1${common.getUniqueString()}`;
		const startTime = new Date(Date.now() - 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0];
		const endTime = new Date(Date.now() - 30 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0];
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${apptSubject}">
						<s d="${startTime}" />
						<e d="${endTime}" />
						<or a="${account1Email}" />
					</inv>
					<e a="${account2Email}" t="t" />
					<su>${apptSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		await soap.waitFor(5000);

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
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const cFiltered = creates.filter(c => c.CalendarItem || c.MeetingRequest);
		const calItem = cFiltered[cFiltered.length - 1];
		const item = calItem?.CalendarItem || calItem?.MeetingRequest;
		assert.exists(item, 'Calendar item should be found in sync results');
		const calId = item.ItemId.$.Id;
		const calCk = item.ItemId.$.ChangeKey;

		const getItemRes = await ews.makeEWSRequest(
			`<m:GetItem xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
				<m:ItemShape>
					<t:BaseShape>Default</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
					<t:BodyType>Text</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:ReminderIsSet" />
						<t:FieldURI FieldURI="item:ReminderMinutesBeforeStart" />
						<t:FieldURI FieldURI="item:ReminderDueBy" />
					</t:AdditionalProperties>
				</m:ItemShape>
				<m:ItemIds>
					<t:ItemId Id="${calId}" ChangeKey="${calCk}" />
				</m:ItemIds>
			</m:GetItem>`,
			account1Email, accountPassword
		);
		const giBody = ews.getBody(getItemRes);
		const giMsg = giBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const giMessage = Array.isArray(giMsg) ? giMsg[0] : giMsg;
		assert.equal(giMessage.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(giMessage.Items.CalendarItem.Subject, apptSubject,
			'Subject should match');
		assert.exists(giMessage.Items.CalendarItem.RequiredAttendees,
			'RequiredAttendees should exist');
	});


	it('Sanity | Create a simple all day appointment from ZWC and sync on EWS client', async () => {
		const apptSubject = `subject2${common.getUniqueString()}`;
		const startTime = new Date(Date.now() - 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0];
		const endTime = new Date(Date.now() - 30 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0];
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="1"
						name="${apptSubject}">
						<s d="${startTime}" />
						<e d="${endTime}" />
						<or a="${account1Email}" />
					</inv>
					<e a="${account2Email}" t="t" />
					<su>${apptSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		await soap.waitFor(5000);

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
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const cFiltered = creates.filter(c => c.CalendarItem || c.MeetingRequest);
		const calItem = cFiltered[cFiltered.length - 1];
		const item = calItem?.CalendarItem || calItem?.MeetingRequest;
		assert.exists(item, 'Calendar item should be found in sync results');
		const calId = item.ItemId.$.Id;
		const calCk = item.ItemId.$.ChangeKey;

		const getItemRes = await ews.makeEWSRequest(
			`<m:GetItem xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
				<m:ItemShape>
					<t:BaseShape>Default</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
					<t:BodyType>Text</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:ReminderIsSet" />
						<t:FieldURI FieldURI="item:ReminderMinutesBeforeStart" />
						<t:FieldURI FieldURI="item:ReminderDueBy" />
						<t:FieldURI FieldURI="calendar:IsAllDayEvent" />
					</t:AdditionalProperties>
				</m:ItemShape>
				<m:ItemIds>
					<t:ItemId Id="${calId}" ChangeKey="${calCk}" />
				</m:ItemIds>
			</m:GetItem>`,
			account1Email, accountPassword
		);
		const giBody = ews.getBody(getItemRes);
		const giMsg = giBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const giMessage = Array.isArray(giMsg) ? giMsg[0] : giMsg;
		assert.equal(giMessage.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(giMessage.Items.CalendarItem.Subject, apptSubject,
			'Subject should match');
		assert.equal(giMessage.Items.CalendarItem.IsAllDayEvent, 'true',
			'IsAllDayEvent should be true');
	});


	it('Sanity | Create a simple appointment from ZWC spanning across multiple days and sync on EWS client 1', async () => {
		const apptSubject = `subject3${common.getUniqueString()}`;
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${apptSubject}">
						<s d="20181204T123006" />
						<e d="20181206T113006" />
						<or a="${account1Email}" />
					</inv>
					<e a="${account2Email}" t="t" />
					<su>${apptSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		await soap.waitFor(5000);

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
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const cFiltered = creates.filter(c => c.CalendarItem || c.MeetingRequest);
		const calItem = cFiltered[cFiltered.length - 1];
		const item = calItem?.CalendarItem || calItem?.MeetingRequest;
		assert.exists(item, 'Calendar item should be found in sync results');
		const calId = item.ItemId.$.Id;
		const calCk = item.ItemId.$.ChangeKey;

		const getItemRes = await ews.makeEWSRequest(
			`<m:GetItem xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
				<m:ItemShape>
					<t:BaseShape>Default</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
					<t:BodyType>Text</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:ReminderIsSet" />
						<t:FieldURI FieldURI="item:ReminderMinutesBeforeStart" />
						<t:FieldURI FieldURI="item:ReminderDueBy" />
						<t:FieldURI FieldURI="calendar:IsAllDayEvent" />
					</t:AdditionalProperties>
				</m:ItemShape>
				<m:ItemIds>
					<t:ItemId Id="${calId}" ChangeKey="${calCk}" />
				</m:ItemIds>
			</m:GetItem>`,
			account1Email, accountPassword
		);
		const giBody = ews.getBody(getItemRes);
		const giMsg = giBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const giMessage = Array.isArray(giMsg) ? giMsg[0] : giMsg;
		assert.equal(giMessage.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(giMessage.Items.CalendarItem.Subject, apptSubject,
			'Subject should match');
		assert.equal(giMessage.Items.CalendarItem.IsAllDayEvent, 'false',
			'IsAllDayEvent should be false');
		assert.include(giMessage.Items.CalendarItem.Start, '2018-12-04',
			'Start should contain 2018-12-04');
		assert.include(giMessage.Items.CalendarItem.End, '2018-12-06',
			'End should contain 2018-12-06');
	});


	it('Sanity | Create a simple appointment from ZWC spanning across multiple days and sync on EWS client 2', async () => {
		const apptSubject = `subject4${common.getUniqueString()}`;
		const apptContent = `content4${common.getUniqueString()}`;
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv method="REQUEST" type="event" fb="B" transp="O" allDay="0"
						name="${apptSubject}">
						<s d="20181204T123006" />
						<e d="20181206T113006" />
						<or a="${account1Email}" />
					</inv>
					<e a="${account2Email}" t="t" />
					<mp content-type="text/plain">
						<content>${apptContent}</content>
					</mp>
					<su>${apptSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		await soap.waitFor(5000);

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
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const cFiltered = creates.filter(c => c.CalendarItem || c.MeetingRequest);
		const calItem = cFiltered[cFiltered.length - 1];
		const item = calItem?.CalendarItem || calItem?.MeetingRequest;
		assert.exists(item, 'Calendar item should be found in sync results');
		const calId = item.ItemId.$.Id;
		const calCk = item.ItemId.$.ChangeKey;

		const getItemRes = await ews.makeEWSRequest(
			`<m:GetItem xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
				<m:ItemShape>
					<t:BaseShape>Default</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
					<t:BodyType>Text</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:ReminderIsSet" />
						<t:FieldURI FieldURI="item:ReminderMinutesBeforeStart" />
						<t:FieldURI FieldURI="item:ReminderDueBy" />
						<t:FieldURI FieldURI="calendar:IsAllDayEvent" />
						<t:FieldURI FieldURI="item:Body" />
					</t:AdditionalProperties>
				</m:ItemShape>
				<m:ItemIds>
					<t:ItemId Id="${calId}" ChangeKey="${calCk}" />
				</m:ItemIds>
			</m:GetItem>`,
			account1Email, accountPassword
		);
		const giBody = ews.getBody(getItemRes);
		const giMsg = giBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const giMessage = Array.isArray(giMsg) ? giMsg[0] : giMsg;
		assert.equal(giMessage.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(giMessage.Items.CalendarItem.Subject, apptSubject,
			'Subject should match');
		assert.equal(giMessage.Items.CalendarItem.IsAllDayEvent, 'false',
			'IsAllDayEvent should be false');
		const bodyText = giMessage.Items.CalendarItem.Body?._ ||
			giMessage.Items.CalendarItem.Body;
		assert.include(String(bodyText), apptContent, 'Body should match');
	});


	it('Sanity | Create a simple appointment from EWS and sync on ZWC client', async () => {
		const apptSubject = `subject5${common.getUniqueString()}`;
		const apptContent = `content5${common.getUniqueString()}`;
		const account2Username = account2Email.split('@')[0];

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
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Body BodyType="HTML">${apptContent}</t:Body>
						<t:Importance>Normal</t:Importance>
						<t:Start>2019-01-04T08:00:00+05:30</t:Start>
						<t:End>2019-01-04T08:30:00+05:30</t:End>
						<t:IsAllDayEvent>false</t:IsAllDayEvent>
						<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
						<t:IsResponseRequested>true</t:IsResponseRequested>
						<t:RequiredAttendees>
							<t:Attendee>
								<t:Mailbox>
									<t:Name>${account2Username}</t:Name>
									<t:EmailAddress>${account2Email}</t:EmailAddress>
								</t:Mailbox>
								<t:ResponseType>NoResponseReceived</t:ResponseType>
							</t:Attendee>
						</t:RequiredAttendees>
						<t:StartTimeZone Id="Sri Lanka Standard Time" />
						<t:EndTimeZone Id="Sri Lanka Standard Time" />
						<t:AllowNewTimeProposal>false</t:AllowNewTimeProposal>
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
			account1Email, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem should succeed');

		await soap.waitFor(3000);

		const account2AuthToken = await soap.getAccountAuthToken(account2Email, accountPassword);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appt = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt[0] : searchRes.SearchResponse.appt;
		assert.exists(appt, 'Appointment should exist on ZWC');
		assert.equal(appt.name, apptSubject, 'Subject should match');
	});


	it('Sanity | Create a simple appointment from EWS and sync on ZWC client spanning across multiple days', async () => {
		const apptSubject = `subject6${common.getUniqueString()}`;
		const apptContent = `content6${common.getUniqueString()}`;
		const account2Username = account2Email.split('@')[0];

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
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Body BodyType="HTML">${apptContent}</t:Body>
						<t:Importance>Normal</t:Importance>
						<t:Start>2019-01-04T08:00:00+05:30</t:Start>
						<t:End>2019-01-05T08:30:00+05:30</t:End>
						<t:IsAllDayEvent>false</t:IsAllDayEvent>
						<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
						<t:IsResponseRequested>true</t:IsResponseRequested>
						<t:RequiredAttendees>
							<t:Attendee>
								<t:Mailbox>
									<t:Name>${account2Username}</t:Name>
									<t:EmailAddress>${account2Email}</t:EmailAddress>
								</t:Mailbox>
								<t:ResponseType>NoResponseReceived</t:ResponseType>
							</t:Attendee>
						</t:RequiredAttendees>
						<t:StartTimeZone Id="Sri Lanka Standard Time" />
						<t:EndTimeZone Id="Sri Lanka Standard Time" />
						<t:AllowNewTimeProposal>false</t:AllowNewTimeProposal>
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
			account1Email, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem should succeed');

		await soap.waitFor(3000);

		const account2AuthToken = await soap.getAccountAuthToken(account2Email, accountPassword);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appt = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt[0] : searchRes.SearchResponse.appt;
		assert.exists(appt, 'Appointment should exist on ZWC');
		assert.equal(appt.name, apptSubject, 'Subject should match');

		assert.exists(appt, 'Appointment details should exist');
		const invId = appt.invId;
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}" />
			</GetMsgRequest>`, account2AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		const msgData = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const inv = Array.isArray(msgData.inv) ? msgData.inv[0] : msgData.inv;
		const comp = Array.isArray(inv?.comp) ? inv.comp[0] : inv?.comp;
		assert.exists(comp, 'Appointment details should exist');
	});


	it('Sanity | Create a simple All day appointment from EWS and sync on ZWC client', async () => {
		const apptSubject = `subject7${common.getUniqueString()}`;
		const apptContent = `content7${common.getUniqueString()}`;

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
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Body BodyType="HTML">${apptContent}</t:Body>
						<t:Importance>Normal</t:Importance>
						<t:Start>2019-01-06T00:00:00+05:30</t:Start>
						<t:End>2019-01-07T00:00:00+05:30</t:End>
						<t:IsAllDayEvent>true</t:IsAllDayEvent>
						<t:LegacyFreeBusyStatus>Free</t:LegacyFreeBusyStatus>
						<t:IsResponseRequested>true</t:IsResponseRequested>
						<t:StartTimeZone Id="Sri Lanka Standard Time" />
						<t:EndTimeZone Id="Sri Lanka Standard Time" />
						<t:AllowNewTimeProposal>false</t:AllowNewTimeProposal>
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
			account1Email, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem should succeed');

		await soap.waitFor(3000);

		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appt = Array.isArray(searchRes.SearchResponse?.appt)
			? searchRes.SearchResponse.appt[0] : searchRes.SearchResponse?.appt;
		assert.exists(appt, 'Appointment should exist');
		assert.equal(appt.name, apptSubject, 'Subject should match');

		const invId = appt.invId;
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}" />
			</GetMsgRequest>`, account1AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		const msgData6 = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const inv6 = Array.isArray(msgData6.inv) ? msgData6.inv[0] : msgData6.inv;
		const comp6 = Array.isArray(inv6?.comp) ? inv6.comp[0] : inv6?.comp;
		assert.equal(comp6?.allDay, '1', 'allDay should be 1');
	});


	it('Sanity | Create a simple All day meeting from EWS and sync on ZWC client', async () => {
		const apptSubject = `subject8${common.getUniqueString()}`;
		const apptContent = `content8${common.getUniqueString()}`;
		const account2Username = account2Email.split('@')[0];

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
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Body BodyType="HTML">${apptContent}</t:Body>
						<t:Importance>Normal</t:Importance>
						<t:Start>2019-01-07T00:00:00+05:30</t:Start>
						<t:End>2019-01-08T00:00:00+05:30</t:End>
						<t:IsAllDayEvent>true</t:IsAllDayEvent>
						<t:LegacyFreeBusyStatus>Free</t:LegacyFreeBusyStatus>
						<t:IsResponseRequested>true</t:IsResponseRequested>
						<t:RequiredAttendees>
							<t:Attendee>
								<t:Mailbox>
									<t:Name>${account2Username}</t:Name>
									<t:EmailAddress>${account2Email}</t:EmailAddress>
								</t:Mailbox>
								<t:ResponseType>NoResponseReceived</t:ResponseType>
							</t:Attendee>
						</t:RequiredAttendees>
						<t:StartTimeZone Id="Sri Lanka Standard Time" />
						<t:EndTimeZone Id="Sri Lanka Standard Time" />
						<t:AllowNewTimeProposal>false</t:AllowNewTimeProposal>
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
			account1Email, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem should succeed');

		await soap.waitFor(3000);

		const account2AuthToken = await soap.getAccountAuthToken(account2Email, accountPassword);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appt = Array.isArray(searchRes.SearchResponse?.appt)
			? searchRes.SearchResponse.appt[0] : searchRes.SearchResponse?.appt;
		assert.exists(appt, 'Appointment should exist');
		assert.equal(appt.name, apptSubject, 'Subject should match');

		const invId = appt.invId;
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}" />
			</GetMsgRequest>`, account2AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		const msgData7 = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const inv7 = Array.isArray(msgData7.inv) ? msgData7.inv[0] : msgData7.inv;
		const comp7 = Array.isArray(inv7?.comp) ? inv7.comp[0] : inv7?.comp;
		assert.equal(comp7?.allDay, '1', 'allDay should be 1');
	});


	it('Sanity | Create a simple meeting inviting multiple users from EWS and sync on ZWC client', async () => {
		const apptSubject = `subject9${common.getUniqueString()}`;
		const apptContent = `content9${common.getUniqueString()}`;
		const account2Username = account2Email.split('@')[0];
		const account3Username = account3Email.split('@')[0];

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
						<t:Sensitivity>Normal</t:Sensitivity>
						<t:Body BodyType="HTML">${apptContent}</t:Body>
						<t:Importance>Normal</t:Importance>
						<t:Start>2019-01-07T09:00:00+05:30</t:Start>
						<t:End>2019-01-08T09:15:00+05:30</t:End>
						<t:IsAllDayEvent>false</t:IsAllDayEvent>
						<t:LegacyFreeBusyStatus>busy</t:LegacyFreeBusyStatus>
						<t:IsResponseRequested>true</t:IsResponseRequested>
						<t:RequiredAttendees>
							<t:Attendee>
								<t:Mailbox>
									<t:Name>${account2Username}</t:Name>
									<t:EmailAddress>${account2Email}</t:EmailAddress>
								</t:Mailbox>
								<t:ResponseType>NoResponseReceived</t:ResponseType>
							</t:Attendee>
							<t:Attendee>
								<t:Mailbox>
									<t:Name>${account3Username}</t:Name>
									<t:EmailAddress>${account3Email}</t:EmailAddress>
								</t:Mailbox>
								<t:ResponseType>NoResponseReceived</t:ResponseType>
							</t:Attendee>
						</t:RequiredAttendees>
						<t:StartTimeZone Id="Sri Lanka Standard Time" />
						<t:EndTimeZone Id="Sri Lanka Standard Time" />
						<t:AllowNewTimeProposal>false</t:AllowNewTimeProposal>
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
			account1Email, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem should succeed');

		await soap.waitFor(3000);

		// Verify on account2
		const account2AuthToken = await soap.getAccountAuthToken(account2Email, accountPassword);
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, account2AuthToken
		);
		assert.notExists(searchRes2.Fault, 'Response should not be a Fault');
		const appt2 = Array.isArray(searchRes2.SearchResponse?.appt)
			? searchRes2.SearchResponse.appt[0] : searchRes2.SearchResponse?.appt;
		assert.exists(appt2, 'Appointment should exist for account2');
		assert.equal(appt2.name, apptSubject, 'Subject should match');

		// Verify on account3
		const account3AuthToken = await soap.getAccountAuthToken(account3Email, accountPassword);
		const searchRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, account3AuthToken
		);
		assert.notExists(searchRes3.Fault, 'Response should not be a Fault');
		const appt3 = Array.isArray(searchRes3.SearchResponse?.appt)
			? searchRes3.SearchResponse.appt[0] : searchRes3.SearchResponse?.appt;
		assert.exists(appt3, 'Appointment should exist for account3');
		assert.equal(appt3.name, apptSubject, 'Subject should match');
	});


	it('Sanity | Create a simple All day appointment from ZWC and sync on EWS client', async () => {
		const apptSubject = `subject10${common.getUniqueString()}`;
		const apptContent = `content10${common.getUniqueString()}`;
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="1"
							name="${apptSubject}">
							<s d="20191204" />
							<e d="20191204" />
							<or a="${account1Email}" />
						</comp>
					</inv>
					<su>${apptSubject}</su>
					<mp content-type="text/plain">
						<content>${apptContent}</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		await soap.waitFor(5000);

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
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const cFiltered = creates.filter(c => c.CalendarItem || c.MeetingRequest);
		const calItem = cFiltered[cFiltered.length - 1];
		const item = calItem?.CalendarItem || calItem?.MeetingRequest;
		assert.exists(item, 'Calendar item should be found in sync results');
		const calId = item.ItemId.$.Id;
		const calCk = item.ItemId.$.ChangeKey;

		const getItemRes = await ews.makeEWSRequest(
			`<m:GetItem xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
				<m:ItemShape>
					<t:BaseShape>Default</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
					<t:BodyType>Text</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:ReminderIsSet" />
						<t:FieldURI FieldURI="item:ReminderMinutesBeforeStart" />
						<t:FieldURI FieldURI="item:ReminderDueBy" />
						<t:FieldURI FieldURI="calendar:IsAllDayEvent" />
						<t:FieldURI FieldURI="item:Body" />
					</t:AdditionalProperties>
				</m:ItemShape>
				<m:ItemIds>
					<t:ItemId Id="${calId}" ChangeKey="${calCk}" />
				</m:ItemIds>
			</m:GetItem>`,
			account1Email, accountPassword
		);
		const giBody = ews.getBody(getItemRes);
		const giMsg = giBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const giMessage = Array.isArray(giMsg) ? giMsg[0] : giMsg;
		assert.equal(giMessage.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(giMessage.Items.CalendarItem.Subject, apptSubject,
			'Subject should match');
		assert.equal(giMessage.Items.CalendarItem.IsAllDayEvent, 'true',
			'IsAllDayEvent should be true');
		const bodyText = giMessage.Items.CalendarItem.Body?._ ||
			giMessage.Items.CalendarItem.Body;
		assert.include(String(bodyText), apptContent, 'Body should match');
		assert.include(giMessage.Items.CalendarItem.Start, '2019-12-04T00:00:00',
			'Start should contain correct date');
		assert.include(giMessage.Items.CalendarItem.End, '2019-12-05T00:00:00',
			'End should contain correct date');
	});


	it('Sanity | Create a private calendar appointment from ZWC and sync on EWS client', async () => {
		const apptSubject = `subject11${common.getUniqueString()}`;
		const startTime = new Date(Date.now() - 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0];
		const endTime = new Date(Date.now() - 30 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0];
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv class="PRI" method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${apptSubject}">
						<s d="${startTime}" />
						<e d="${endTime}" />
						<or a="${account1Email}" />
					</inv>
					<e a="${account2Email}" t="t" />
					<su>${apptSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		await soap.waitFor(5000);

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
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const cFiltered = creates.filter(c => c.CalendarItem || c.MeetingRequest);
		const calItem = cFiltered[cFiltered.length - 1];
		const item = calItem?.CalendarItem || calItem?.MeetingRequest;
		assert.exists(item, 'Calendar item should be found in sync results');
		const calId = item.ItemId.$.Id;
		const calCk = item.ItemId.$.ChangeKey;

		const getItemRes = await ews.makeEWSRequest(
			`<m:GetItem xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
				<m:ItemShape>
					<t:BaseShape>Default</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
					<t:BodyType>Text</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:ReminderIsSet" />
						<t:FieldURI FieldURI="item:ReminderMinutesBeforeStart" />
						<t:FieldURI FieldURI="item:ReminderDueBy" />
						<t:FieldURI FieldURI="item:Sensitivity" />
					</t:AdditionalProperties>
				</m:ItemShape>
				<m:ItemIds>
					<t:ItemId Id="${calId}" ChangeKey="${calCk}" />
				</m:ItemIds>
			</m:GetItem>`,
			account1Email, accountPassword
		);
		const giBody = ews.getBody(getItemRes);
		const giMsg = giBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const giMessage = Array.isArray(giMsg) ? giMsg[0] : giMsg;
		assert.equal(giMessage.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(giMessage.Items.CalendarItem.Subject, apptSubject,
			'Subject should match');
		assert.equal(giMessage.Items.CalendarItem.Sensitivity, 'Private',
			'Sensitivity should be Private');
	});


	it('Sanity | Create a private calendar appointment from EWS and sync on ZWC client', async () => {
		const apptSubject = `subject12${common.getUniqueString()}`;
		const apptContent = `content12${common.getUniqueString()}`;

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
						<t:Sensitivity>Private</t:Sensitivity>
						<t:Body BodyType="HTML">${apptContent}</t:Body>
						<t:Importance>Normal</t:Importance>
						<t:Start>2019-01-07T00:00:00+05:30</t:Start>
						<t:End>2019-01-08T00:00:00+05:30</t:End>
						<t:IsAllDayEvent>true</t:IsAllDayEvent>
						<t:LegacyFreeBusyStatus>Free</t:LegacyFreeBusyStatus>
						<t:IsResponseRequested>true</t:IsResponseRequested>
						<t:StartTimeZone Id="Sri Lanka Standard Time" />
						<t:EndTimeZone Id="Sri Lanka Standard Time" />
						<t:AllowNewTimeProposal>false</t:AllowNewTimeProposal>
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
			account1Email, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem should succeed');

		await soap.waitFor(3000);

		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appt = Array.isArray(searchRes.SearchResponse?.appt)
			? searchRes.SearchResponse.appt[0] : searchRes.SearchResponse?.appt;
		assert.exists(appt, 'Appointment should exist');
		assert.equal(appt.name, apptSubject, 'Subject should match');

		const invId = appt.invId;
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}" />
			</GetMsgRequest>`, account1AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		const msgData10 = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const inv10 = Array.isArray(msgData10.inv) ? msgData10.inv[0] : msgData10.inv;
		const comp10 = Array.isArray(inv10?.comp) ? inv10.comp[0] : inv10?.comp;
		assert.equal(comp10?.class, 'PRI', 'Class should be PRI (Private)');
		assert.equal(comp10?.name, apptSubject, 'Name should match');
	});


	it('Sanity | Create a calendar appointment with attachment from ZWC and sync on EWS client', async () => {
		const apptSubject = `subject13${common.getUniqueString()}`;
		const startTime = new Date(Date.now() - 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0];
		const endTime = new Date(Date.now() - 30 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0];
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);

		// Upload attachment
		const uploadRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<su>temp</su>
					<mp ct="multipart/mixed">
						<mp ct="text/plain">
							<content>temp</content>
						</mp>
					</mp>
				</m>
			</SaveDraftRequest>`, account1AuthToken
		);

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv class="PRI" method="REQUEST" type="event" fb="B" transp="O"
						allDay="0" name="${apptSubject}">
						<s d="${startTime}" />
						<e d="${endTime}" />
						<or a="${account1Email}" />
					</inv>
					<su>${apptSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		await soap.waitFor(5000);

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
		const creates = Array.isArray(syncMessage.Changes.Create)
			? syncMessage.Changes.Create : [syncMessage.Changes.Create];
		const cFiltered = creates.filter(c => c.CalendarItem || c.MeetingRequest);
		const calItem = cFiltered[cFiltered.length - 1];
		const item = calItem?.CalendarItem || calItem?.MeetingRequest;
		assert.exists(item, 'Calendar item should be found in sync results');
		const calId = item.ItemId.$.Id;
		const calCk = item.ItemId.$.ChangeKey;

		const getItemRes = await ews.makeEWSRequest(
			`<m:GetItem xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages"
				xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types">
				<m:ItemShape>
					<t:BaseShape>Default</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
					<t:BodyType>Text</t:BodyType>
					<t:AdditionalProperties>
						<t:FieldURI FieldURI="item:ReminderIsSet" />
						<t:FieldURI FieldURI="item:ReminderMinutesBeforeStart" />
						<t:FieldURI FieldURI="item:ReminderDueBy" />
						<t:FieldURI FieldURI="item:Sensitivity" />
						<t:FieldURI FieldURI="item:Attachments" />
					</t:AdditionalProperties>
				</m:ItemShape>
				<m:ItemIds>
					<t:ItemId Id="${calId}" ChangeKey="${calCk}" />
				</m:ItemIds>
			</m:GetItem>`,
			account1Email, accountPassword
		);
		const giBody = ews.getBody(getItemRes);
		const giMsg = giBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		const giMessage = Array.isArray(giMsg) ? giMsg[0] : giMsg;
		assert.equal(giMessage.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(giMessage.Items.CalendarItem.Subject, apptSubject,
			'Subject should match');
	});


	it('Sanity | Create a calendar appointment with attachment from EWS and sync on ZWC client', async () => {
		const apptSubject = `subject14${common.getUniqueString()}`;
		const apptContent = `content14${common.getUniqueString()}`;

		// Create calendar item from EWS
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
						<t:Sensitivity>Private</t:Sensitivity>
						<t:Body BodyType="HTML">${apptContent}</t:Body>
						<t:Importance>Normal</t:Importance>
						<t:Start>2019-01-07T10:00:00+05:30</t:Start>
						<t:End>2019-01-08T10:30:00+05:30</t:End>
						<t:IsAllDayEvent>false</t:IsAllDayEvent>
						<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
						<t:IsResponseRequested>true</t:IsResponseRequested>
						<t:StartTimeZone Id="Sri Lanka Standard Time" />
						<t:EndTimeZone Id="Sri Lanka Standard Time" />
						<t:AllowNewTimeProposal>false</t:AllowNewTimeProposal>
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
			account1Email, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		const createMessage = Array.isArray(createMsg) ? createMsg[0] : createMsg;
		assert.equal(createMessage.$.ResponseClass, 'Success',
			'CreateItem should succeed');
		const ewsCalId = createMessage.Items.CalendarItem.ItemId.$.Id;

		// Add attachment via EWS CreateAttachment
		const attachRes = await ews.makeEWSRequest(
			`<CreateAttachment xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ParentItemId Id="${ewsCalId}" />
				<Attachments>
					<t:FileAttachment>
						<t:Name>Contacts.ldif</t:Name>
						<t:ContentType>application/octet-stream</t:ContentType>
						<t:IsContactPhoto>false</t:IsContactPhoto>
						<t:Content>dmVyc2lvbjogMQ0KDQpkbjogdWlkPWFzZGFzLG91PXBlb3BsZSxkYz1zYWRhc2RfZGV0YWlscyxkYz1jb20NCm9iamVjdENsYXNzOiBpbmV0T3JnUGVyc29uDQo=</t:Content>
					</t:FileAttachment>
				</Attachments>
			</CreateAttachment>`,
			account1Email, accountPassword
		);
		const attachBody = ews.getBody(attachRes);
		const attachMsg = attachBody.CreateAttachmentResponse
			.ResponseMessages.CreateAttachmentResponseMessage;
		const attachMessage = Array.isArray(attachMsg) ? attachMsg[0] : attachMsg;
		assert.equal(attachMessage.$.ResponseClass, 'Success',
			'CreateAttachment should succeed');

		await soap.waitFor(3000);

		// Verify on ZWC
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appt = Array.isArray(searchRes.SearchResponse?.appt)
			? searchRes.SearchResponse.appt[0] : searchRes.SearchResponse?.appt;
		assert.exists(appt, 'Appointment should exist');
		assert.equal(appt.name, apptSubject, 'Subject should match');

		const invId = appt.invId;
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}" />
			</GetMsgRequest>`, account1AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		const msgStr = JSON.stringify(getMsgRes.GetMsgResponse);
		assert.include(msgStr, 'attachment', 'Should have attachment');
		assert.include(msgStr, 'Contacts.ldif', 'Should have Contacts.ldif');
	});
});
