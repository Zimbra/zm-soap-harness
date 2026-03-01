import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import ews from '../../../framework/backend/ews.js';
import { main } from '../../../pages/main.js';

describe('EWS > Calendar > Calendar Meeting Response', function () {
	this.timeout(300 * 1000);
	let adminAuthToken, account1Email, account2Email, account3Email, accountPassword;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		const unique = common.getUniqueString();
		accountPassword = config.accountPassword;
		account1Email = `test1.${unique}@${config.testDomain}`;
		account2Email = `test2.${unique}@${config.testDomain}`;
		account3Email = `test3.${unique}@${config.testDomain}`;

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
	it('Sanity | Send a meeting invite from ZWC organizer to EWS attendee 1', async () => {
		const unique = common.getUniqueString();
		const apptSubject = `subject1.${unique}`;
		const apptContent = `content1.${unique}`;

		// ZWC organizer creates appointment
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${apptSubject}">
							<or a="${account1Email}" />
							<at a="${account2Email}" role="REQ" ptst="NE" rsvp="1" />
							<s d="${common.getICALTime(30)}" />
							<e d="${common.getICALTime(60)}" />
						</comp>
					</inv>
					<e a="${account2Email}" t="t" />
					<su>${apptSubject}</su>
					<mp ct="text/plain">
						<content>${apptContent}</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		await soap.waitFor(5000);

		// EWS attendee syncs inbox to get the meeting invite
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="2" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
				<SyncScope>NormalAndAssociatedItems</SyncScope>
			</SyncFolderItems>`,
			account2Email, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		assert.equal(syncMsg.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMsg.Changes.Create)
			? syncMsg.Changes.Create : [syncMsg.Changes.Create];
		const cFiltered = creates.filter(c => c?.CalendarItem || c?.MeetingRequest || c?.Message);
		const calCreate = cFiltered[cFiltered.length - 1];
		const itemNode = calCreate?.CalendarItem || calCreate?.MeetingRequest || calCreate?.Message;
		const calId = itemNode?.ItemId?.$.Id;
		assert.exists(calId, 'Calendar item Id should exist');

		// EWS attendee accepts the meeting
		const acceptRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy"
				SendMeetingInvitations="SendToAllAndSaveCopy">
				<Items>
					<t:AcceptItem>
						<t:ReferenceItemId Id="${calId}" />
					</t:AcceptItem>
				</Items>
			</CreateItem>`,
			account2Email, accountPassword
		);
		const acceptBody = ews.getBody(acceptRes);
		const acceptMsg = acceptBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		assert.equal(acceptMsg.$.ResponseClass, 'Success', 'AcceptItem should succeed');

		await soap.waitFor(5000);

		// Verify on ZWC organizer that acceptance is received
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appt = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt[0] : searchRes.SearchResponse.appt;
		const invId = appt.invId;
		assert.exists(invId, 'Appointment invId should exist');

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}" />
			</GetMsgRequest>`, account1AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		const msgComp = getMsgRes.GetMsgResponse.m[0] || getMsgRes.GetMsgResponse.m;
		const attendees = msgComp.inv[0].comp[0].at;
		const attendee = Array.isArray(attendees)
			? attendees.find(a => a.a === account2Email) : attendees;
		assert.equal(attendee.ptst, 'AC', 'Attendee participation status should be AC (Accepted)');
	});


	it('Sanity | Send a meeting invite from ZWC organizer to EWS attendee 2', async () => {
		const unique = common.getUniqueString();
		const apptSubject = `subject2.${unique}`;
		const apptContent = `content2.${unique}`;

		// ZWC organizer creates appointment
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${apptSubject}">
							<or a="${account1Email}" />
							<at a="${account3Email}" role="REQ" ptst="NE" rsvp="1" />
							<s d="${common.getICALTime(30)}" />
							<e d="${common.getICALTime(60)}" />
						</comp>
					</inv>
					<e a="${account3Email}" t="t" />
					<su>${apptSubject}</su>
					<mp ct="text/plain">
						<content>${apptContent}</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		await soap.waitFor(5000);

		// EWS attendee syncs inbox to get the meeting invite
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="2" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
				<SyncScope>NormalAndAssociatedItems</SyncScope>
			</SyncFolderItems>`,
			account3Email, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		assert.equal(syncMsg.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMsg.Changes.Create)
			? syncMsg.Changes.Create : [syncMsg.Changes.Create];
		const cFiltered = creates.filter(c => c?.CalendarItem || c?.MeetingRequest || c?.Message);
		const calCreate = cFiltered[cFiltered.length - 1];
		const itemNode = calCreate?.CalendarItem || calCreate?.MeetingRequest || calCreate?.Message;
		const calId = itemNode?.ItemId?.$.Id;
		assert.exists(calId, 'Calendar item Id should exist');

		// EWS attendee declines the meeting
		const declineRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy"
				SendMeetingInvitations="SendToAllAndSaveCopy">
				<Items>
					<t:DeclineItem>
						<t:ReferenceItemId Id="${calId}" />
					</t:DeclineItem>
				</Items>
			</CreateItem>`,
			account3Email, accountPassword
		);
		const declineBody = ews.getBody(declineRes);
		const declineMsg = declineBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		assert.equal(declineMsg.$.ResponseClass, 'Success', 'DeclineItem should succeed');

		await soap.waitFor(5000);

		// Verify on ZWC organizer that decline is received
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appt = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt[0] : searchRes.SearchResponse.appt;
		const invId = appt.invId;
		assert.exists(invId, 'Appointment invId should exist');

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}" />
			</GetMsgRequest>`, account1AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		const msgComp = getMsgRes.GetMsgResponse.m[0] || getMsgRes.GetMsgResponse.m;
		const attendees = msgComp.inv[0].comp[0].at;
		const attendee = Array.isArray(attendees)
			? attendees.find(a => a.a === account3Email) : attendees;
		assert.equal(attendee.ptst, 'DE', 'Attendee participation status should be DE (Declined)');
	});


	it('Sanity | Send a meeting invite from ZWC organizer to EWS attendee 3', async () => {
		const unique = common.getUniqueString();
		const apptSubject = `subject3.${unique}`;
		const apptContent = `content3.${unique}`;

		// ZWC organizer creates appointment
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${apptSubject}">
							<or a="${account1Email}" />
							<at a="${account3Email}" role="REQ" ptst="NE" rsvp="1" />
							<s d="${common.getICALTime(30)}" />
							<e d="${common.getICALTime(60)}" />
						</comp>
					</inv>
					<e a="${account3Email}" t="t" />
					<su>${apptSubject}</su>
					<mp ct="text/plain">
						<content>${apptContent}</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, account1AuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		await soap.waitFor(5000);

		// EWS attendee syncs inbox to get the meeting invite
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="2" />
				</SyncFolderId>
				<SyncState />
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
				<SyncScope>NormalAndAssociatedItems</SyncScope>
			</SyncFolderItems>`,
			account3Email, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		assert.equal(syncMsg.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMsg.Changes.Create)
			? syncMsg.Changes.Create : [syncMsg.Changes.Create];
		const cFiltered = creates.filter(c => c?.CalendarItem || c?.MeetingRequest || c?.Message);
		const calCreate = cFiltered[cFiltered.length - 1];
		const itemNode = calCreate?.CalendarItem || calCreate?.MeetingRequest || calCreate?.Message;
		const calId = itemNode?.ItemId?.$.Id;
		assert.exists(calId, 'Calendar item Id should exist');

		// EWS attendee tentatively accepts the meeting
		const tentRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy"
				SendMeetingInvitations="SendToAllAndSaveCopy">
				<Items>
					<t:TentativelyAcceptItem>
						<t:ReferenceItemId Id="${calId}" />
					</t:TentativelyAcceptItem>
				</Items>
			</CreateItem>`,
			account3Email, accountPassword
		);
		const tentBody = ews.getBody(tentRes);
		const tentMsg = tentBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		assert.equal(tentMsg.$.ResponseClass, 'Success', 'TentativelyAcceptItem should succeed');

		await soap.waitFor(5000);

		// Verify on ZWC organizer that tentative response is received
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appt = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt[0] : searchRes.SearchResponse.appt;
		const invId = appt.invId;
		assert.exists(invId, 'Appointment invId should exist');

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}" />
			</GetMsgRequest>`, account1AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		const msgComp = getMsgRes.GetMsgResponse.m[0] || getMsgRes.GetMsgResponse.m;
		const attendees = msgComp.inv[0].comp[0].at;
		const attendee = Array.isArray(attendees)
			? attendees.find(a => a.a === account3Email) : attendees;
		assert.equal(attendee.ptst, 'TE', 'Attendee participation status should be TE (Tentative)');
	});


	it('Sanity | Send a meeting invite from EWS organizer to ZWC attendee 1', async () => {
		const unique = common.getUniqueString();
		const apptSubject = `subject4.${unique}`;
		const apptContent = `content4.${unique}`;

		// EWS organizer creates meeting
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
						<t:Start>2019-01-06T08:00:00+05:30</t:Start>
						<t:End>2019-01-07T08:30:00+05:30</t:End>
						<t:IsAllDayEvent>false</t:IsAllDayEvent>
						<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
						<t:IsResponseRequested>true</t:IsResponseRequested>
						<t:RequiredAttendees>
							<t:Attendee>
								<t:Mailbox>
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
		assert.equal(createMsg.$.ResponseClass, 'Success', 'CreateItem should succeed');

		// EWS organizer syncs calendar folder
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems
				xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
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
			account1Email, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		assert.equal(syncMsg.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');

		// ZWC attendee accepts the meeting
		await soap.waitFor(5000);

		const acct2AuthToken = await soap.getAccountAuthToken(account2Email, accountPassword);

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>${apptSubject} inid:10</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appt = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt[0] : searchRes.SearchResponse.appt;
		const invId = appt.invId;
		const compNum = appt.compNum;
		const organizer = appt.or?.a || account1Email;

		const acceptRes = await soap.makeSOAPEnvelopeAccount(
			`<SendInviteReplyRequest xmlns="urn:zimbraMail"
				id="${invId}" compNum="${compNum}" verb="ACCEPT"
				updateOrganizer="TRUE">
				<m rt="r">
					<e t="t" a="${organizer}" />
					<su>Accept: ${apptSubject}</su>
					<mp ct="text/plain">
						<content>Accept: ${apptContent}</content>
					</mp>
				</m>
			</SendInviteReplyRequest>`, acct2AuthToken
		);
		assert.notExists(acceptRes.Fault, 'Response should not be a Fault');

		await soap.waitFor(5000);

		// Verify on EWS organizer via GetItem
		const syncRes2 = await ews.makeEWSRequest(
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
				<MaxChangesReturned>512</MaxChangesReturned>
				<SyncScope>NormalAndAssociatedItems</SyncScope>
			</SyncFolderItems>`,
			account1Email, accountPassword
		);
		const syncBody2 = ews.getBody(syncRes2);
		const syncMsg2 = syncBody2.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		assert.equal(syncMsg2.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');

		const creates2 = Array.isArray(syncMsg2.Changes.Create)
			? syncMsg2.Changes.Create : [syncMsg2.Changes.Create];
		const cFiltered2 = creates2.filter(c => c?.CalendarItem);
		const calCreate2 = cFiltered2[cFiltered2.length - 1];
		const calId2 = calCreate2?.CalendarItem?.ItemId?.$.Id;
		const calCk2 = calCreate2?.CalendarItem?.ItemId?.$.ChangeKey;
		assert.exists(calId2, 'Calendar item Id should exist');

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
					<t:ItemId Id="${calId2}" ChangeKey="${calCk2}" />
				</m:ItemIds>
			</m:GetItem>`,
			account1Email, accountPassword
		);
		const giBody = ews.getBody(getItemRes);
		const giMsg = giBody.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		assert.equal(giMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		const calItem = giMsg.Items.CalendarItem;
		assert.equal(calItem.Subject, apptSubject, 'Subject should match');
		assert.equal(calItem.IsAllDayEvent, 'false', 'IsAllDayEvent should be false');
		const reqAttendees = Array.isArray(calItem.RequiredAttendees?.Attendee)
			? calItem.RequiredAttendees.Attendee : [calItem.RequiredAttendees?.Attendee];
		const att = reqAttendees.find(a => a?.Mailbox?.EmailAddress === account2Email);
		assert.equal(att.ResponseType, 'Accept', 'Attendee ResponseType should be Accept');
	});


	it('Sanity | Send a meeting invite from EWS organizer to ZWC attendee 2', async () => {
		const unique = common.getUniqueString();
		const apptSubject = `subject5.${unique}`;
		const apptContent = `content5.${unique}`;

		// EWS organizer creates meeting
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
						<t:Start>2019-01-06T09:00:00+05:30</t:Start>
						<t:End>2019-01-07T09:30:00+05:30</t:End>
						<t:IsAllDayEvent>false</t:IsAllDayEvent>
						<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
						<t:IsResponseRequested>true</t:IsResponseRequested>
						<t:RequiredAttendees>
							<t:Attendee>
								<t:Mailbox>
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
		assert.equal(createMsg.$.ResponseClass, 'Success', 'CreateItem should succeed');

		// EWS organizer syncs calendar folder
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems
				xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
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
			account1Email, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		assert.equal(syncMsg.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const syncState = syncMsg.SyncState;

		// ZWC attendee declines the meeting
		await soap.waitFor(5000);

		const acct2AuthToken = await soap.getAccountAuthToken(account2Email, accountPassword);

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>${apptSubject} inid:10</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appt = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt[0] : searchRes.SearchResponse.appt;
		const invId = appt.invId;
		const compNum = appt.compNum;
		const organizer = appt.or?.a || account1Email;

		const declineRes = await soap.makeSOAPEnvelopeAccount(
			`<SendInviteReplyRequest xmlns="urn:zimbraMail"
				id="${invId}" compNum="${compNum}" verb="DECLINE"
				updateOrganizer="TRUE">
				<m rt="r">
					<e t="t" a="${organizer}" />
					<su>Decline: ${apptSubject}</su>
					<mp ct="text/plain">
						<content>Decline: ${apptContent}</content>
					</mp>
				</m>
			</SendInviteReplyRequest>`, acct2AuthToken
		);
		assert.notExists(declineRes.Fault, 'Response should not be a Fault');

		await soap.waitFor(5000);

		// Verify on EWS organizer via SyncFolderItems + GetItem
		const syncRes2 = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="10" />
				</SyncFolderId>
				<SyncState>${syncState}</SyncState>
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
				<SyncScope>NormalAndAssociatedItems</SyncScope>
			</SyncFolderItems>`,
			account1Email, accountPassword
		);
		const syncBody2 = ews.getBody(syncRes2);
		const syncMsg2 = syncBody2.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		assert.equal(syncMsg2.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');

		const updates = syncMsg2.Changes?.Update;
		const updateArr = Array.isArray(updates) ? updates : [updates];
		const uFiltered = updateArr.filter(u => u?.CalendarItem);
		const calUpdate = uFiltered[uFiltered.length - 1];
		const calId = calUpdate?.CalendarItem?.ItemId?.$.Id;
		const calCk = calUpdate?.CalendarItem?.ItemId?.$.ChangeKey;
		assert.exists(calId, 'Updated calendar item Id should exist');

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
		assert.equal(giMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		const calItem = giMsg.Items.CalendarItem;
		assert.equal(calItem.Subject, apptSubject, 'Subject should match');
		assert.equal(calItem.IsAllDayEvent, 'false', 'IsAllDayEvent should be false');
		const reqAttendees = Array.isArray(calItem.RequiredAttendees?.Attendee)
			? calItem.RequiredAttendees.Attendee : [calItem.RequiredAttendees?.Attendee];
		const att = reqAttendees.find(a => a?.Mailbox?.EmailAddress === account2Email);
		assert.equal(att.ResponseType, 'Decline', 'Attendee ResponseType should be Decline');
	});


	it('Sanity | Send a meeting invite from EWS organizer to ZWC attendee 3', async () => {
		const unique = common.getUniqueString();
		const apptSubject = `subject6.${unique}`;
		const apptContent = `content6.${unique}`;

		// EWS organizer creates meeting
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
						<t:Start>2019-01-06T11:00:00+05:30</t:Start>
						<t:End>2019-01-07T11:30:00+05:30</t:End>
						<t:IsAllDayEvent>false</t:IsAllDayEvent>
						<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
						<t:IsResponseRequested>true</t:IsResponseRequested>
						<t:RequiredAttendees>
							<t:Attendee>
								<t:Mailbox>
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
		assert.equal(createMsg.$.ResponseClass, 'Success', 'CreateItem should succeed');

		// EWS organizer syncs calendar folder
		const syncRes = await ews.makeEWSRequest(
			`<SyncFolderItems
				xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
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
			account1Email, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		assert.equal(syncMsg.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const syncState = syncMsg.SyncState;

		// ZWC attendee tentatively accepts the meeting
		await soap.waitFor(5000);

		const acct2AuthToken = await soap.getAccountAuthToken(account2Email, accountPassword);

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>${apptSubject} inid:10</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appt = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt[0] : searchRes.SearchResponse.appt;
		const invId = appt.invId;
		const compNum = appt.compNum;
		const organizer = appt.or?.a || account1Email;

		const tentRes = await soap.makeSOAPEnvelopeAccount(
			`<SendInviteReplyRequest xmlns="urn:zimbraMail"
				id="${invId}" compNum="${compNum}" verb="TENTATIVE"
				updateOrganizer="TRUE">
				<m rt="r">
					<e t="t" a="${organizer}" />
					<su>Tentative: ${apptSubject}</su>
					<mp ct="text/plain">
						<content>Tentative: ${apptContent}</content>
					</mp>
				</m>
			</SendInviteReplyRequest>`, acct2AuthToken
		);
		assert.notExists(tentRes.Fault, 'Response should not be a Fault');

		await soap.waitFor(5000);

		// Verify on EWS organizer via SyncFolderItems + GetItem
		const syncRes2 = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="10" />
				</SyncFolderId>
				<SyncState>${syncState}</SyncState>
				<Ignore />
				<MaxChangesReturned>512</MaxChangesReturned>
				<SyncScope>NormalAndAssociatedItems</SyncScope>
			</SyncFolderItems>`,
			account1Email, accountPassword
		);
		const syncBody2 = ews.getBody(syncRes2);
		const syncMsg2 = syncBody2.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		assert.equal(syncMsg2.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');

		const updates = syncMsg2.Changes?.Update;
		const updateArr = Array.isArray(updates) ? updates : [updates];
		const uFiltered = updateArr.filter(u => u?.CalendarItem);
		const calUpdate = uFiltered[uFiltered.length - 1];
		const calId = calUpdate?.CalendarItem?.ItemId?.$.Id;
		const calCk = calUpdate?.CalendarItem?.ItemId?.$.ChangeKey;
		assert.exists(calId, 'Updated calendar item Id should exist');

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
		assert.equal(giMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		const calItem = giMsg.Items.CalendarItem;
		assert.equal(calItem.Subject, apptSubject, 'Subject should match');
		assert.equal(calItem.IsAllDayEvent, 'false', 'IsAllDayEvent should be false');
		const reqAttendees = Array.isArray(calItem.RequiredAttendees?.Attendee)
			? calItem.RequiredAttendees.Attendee : [calItem.RequiredAttendees?.Attendee];
		const att = reqAttendees.find(a => a?.Mailbox?.EmailAddress === account2Email);
		assert.equal(att.ResponseType, 'Tentative', 'Attendee ResponseType should be Tentative');
	});
});
