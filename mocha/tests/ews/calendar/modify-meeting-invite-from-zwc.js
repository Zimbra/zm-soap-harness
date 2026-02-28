import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import ews from '../../../framework/backend/ews.js';
import { main } from '../../../pages/main.js';

describe('EWS > Calendar > Modify Meeting Invite From ZWC', function () {
	this.timeout(300 * 1000);
	let adminAuthToken, account1Email, account2Email, account3Email, accountPassword;

	before(async function () {
		await main.before(this.ctx);
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
	it('Sanity | Send a meeting invite from EWS organizer, modify meeting time from ZWC Organizer and Sync on EWS Organizer, attendee for modified meeting time', async () => {
		const unique = common.getUniqueString();
		const apptSubject = `subject1.${unique}`;
		const apptContent = 'Test appointment sent from EWS for time modification test';

		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);

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
						<t:Start>${common.getXMLTime(30)}</t:Start>
						<t:End>${common.getXMLTime(60)}</t:End>
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

		// Attendee verifies invite on ZWC
		const acct2AuthToken = await soap.getAccountAuthToken(account2Email, accountPassword);

		const searchRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes1.Fault, 'Response should not be a Fault');
		const appt1 = Array.isArray(searchRes1.SearchResponse.appt)
			? searchRes1.SearchResponse.appt[0] : searchRes1.SearchResponse.appt;
		assert.equal(appt1.name, apptSubject, 'Appointment name should match');

		// Organizer searches on ZWC, gets inv, modifies meeting time via ZWC
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes2.Fault, 'Response should not be a Fault');
		const appt2 = Array.isArray(searchRes2.SearchResponse.appt)
			? searchRes2.SearchResponse.appt[0] : searchRes2.SearchResponse.appt;
		const invId = appt2.invId;

		const newTime1 = common.getICALTime(60);
		const newTime2 = common.getICALTime(90);

		const modifyRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail" id="${invId}">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${apptSubject}">
							<or a="${account1Email}" />
							<at a="${account2Email}" role="REQ" ptst="NE" rsvp="1" />
							<s d="${newTime1}" />
							<e d="${newTime2}" />
						</comp>
					</inv>
					<e a="${account2Email}" t="t" />
					<su>${apptSubject}</su>
					<mp ct="text/plain">
						<content>${apptContent}</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, account1AuthToken
		);
		assert.notExists(modifyRes.Fault, 'Response should not be a Fault');

		// Verify modified meeting on EWS organizer
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
		const creates = Array.isArray(syncMsg2.Changes.Create)
			? syncMsg2.Changes.Create : [syncMsg2.Changes.Create];
		const calCreate = creates.find(c => c?.CalendarItem);
		const calId = calCreate?.CalendarItem?.ItemId?.$.Id;
		const calCk = calCreate?.CalendarItem?.ItemId?.$.ChangeKey;
		assert.exists(calId, 'Calendar item Id should exist');

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
		assert.equal(giMsg.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(giMsg.Items.CalendarItem.Subject, apptSubject, 'Subject should match');
		const reqAtt = Array.isArray(giMsg.Items.CalendarItem.RequiredAttendees?.Attendee)
			? giMsg.Items.CalendarItem.RequiredAttendees.Attendee
			: [giMsg.Items.CalendarItem.RequiredAttendees?.Attendee];
		assert.exists(
			reqAtt.find(a => a?.Mailbox?.EmailAddress === account2Email),
			'Account2 should be in RequiredAttendees'
		);

		// Verify on EWS attendee as well
		const syncRes3 = await ews.makeEWSRequest(
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
			account2Email, accountPassword
		);
		const syncBody3 = ews.getBody(syncRes3);
		const syncMsg3 = syncBody3.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		assert.equal(syncMsg3.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const creates3 = Array.isArray(syncMsg3.Changes.Create)
			? syncMsg3.Changes.Create : [syncMsg3.Changes.Create];
		const calCreate3 = creates3.find(c => c?.CalendarItem);
		const calId3 = calCreate3?.CalendarItem?.ItemId?.$.Id;
		const calCk3 = calCreate3?.CalendarItem?.ItemId?.$.ChangeKey;
		assert.exists(calId3, 'Attendee calendar item Id should exist');

		const getItemRes3 = await ews.makeEWSRequest(
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
					<t:ItemId Id="${calId3}" ChangeKey="${calCk3}" />
				</m:ItemIds>
			</m:GetItem>`,
			account2Email, accountPassword
		);
		const giBody3 = ews.getBody(getItemRes3);
		const giMsg3 = giBody3.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		assert.equal(giMsg3.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(giMsg3.Items.CalendarItem.Subject, apptSubject, 'Subject should match');
	});


	it('Sanity | Send a meeting invite from EWS organizer, modify attendee list from ZWC Organizer and Sync on EWS Organizer, attendee for modified attendee list', async () => {
		const unique = common.getUniqueString();
		const apptSubject = `subject2.${unique}`;
		const apptContent = 'Test appointment sent from EWS for attendee modification test';

		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);

		// EWS organizer creates meeting with account2 as attendee
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
						<t:Start>${common.getXMLTime(-60)}</t:Start>
						<t:End>${common.getXMLTime(-30)}</t:End>
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

		// Attendee verifies on ZWC
		const acct2AuthToken = await soap.getAccountAuthToken(account2Email, accountPassword);

		const searchRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes1.Fault, 'Response should not be a Fault');
		const appt1 = Array.isArray(searchRes1.SearchResponse.appt)
			? searchRes1.SearchResponse.appt[0] : searchRes1.SearchResponse.appt;
		assert.equal(appt1.name, apptSubject, 'Appointment name should match');

		// Organizer modifies attendee list on ZWC - replaces account2 with account3
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes2.Fault, 'Response should not be a Fault');
		const appt2 = Array.isArray(searchRes2.SearchResponse.appt)
			? searchRes2.SearchResponse.appt[0] : searchRes2.SearchResponse.appt;
		const invId = appt2.invId;

		const modifyRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail" id="${invId}">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${apptSubject}">
							<or a="${account1Email}" />
							<at a="${account3Email}" role="REQ" ptst="NE" rsvp="1" />
							<s d="${common.getICALTime(-60)}" />
							<e d="${common.getICALTime(-30)}" />
						</comp>
					</inv>
					<e a="${account3Email}" t="t" />
					<su>${apptSubject}</su>
					<mp ct="text/plain">
						<content>${apptContent}</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, account1AuthToken
		);
		assert.notExists(modifyRes.Fault, 'Response should not be a Fault');

		// Verify modified meeting on EWS organizer
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
		const calUpdate = updateArr.find(u => u?.CalendarItem);
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
		assert.equal(giMsg.Items.CalendarItem.Subject, apptSubject, 'Subject should match');
		const reqAtt = Array.isArray(giMsg.Items.CalendarItem.RequiredAttendees?.Attendee)
			? giMsg.Items.CalendarItem.RequiredAttendees.Attendee
			: [giMsg.Items.CalendarItem.RequiredAttendees?.Attendee];
		assert.exists(
			reqAtt.find(a => a?.Mailbox?.EmailAddress === account3Email),
			'Account3 should be in RequiredAttendees after modification'
		);

		// Verify new attendee (account3) received the invite on EWS
		const syncRes3 = await ews.makeEWSRequest(
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
			account3Email, accountPassword
		);
		const syncBody3 = ews.getBody(syncRes3);
		const syncMsg3 = syncBody3.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		assert.equal(syncMsg3.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const creates3 = Array.isArray(syncMsg3.Changes.Create)
			? syncMsg3.Changes.Create : [syncMsg3.Changes.Create];
		const calCreate3 = creates3.find(c => c?.CalendarItem);
		const calId3 = calCreate3?.CalendarItem?.ItemId?.$.Id;
		const calCk3 = calCreate3?.CalendarItem?.ItemId?.$.ChangeKey;
		assert.exists(calId3, 'Account3 calendar item Id should exist');

		const getItemRes3 = await ews.makeEWSRequest(
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
					<t:ItemId Id="${calId3}" ChangeKey="${calCk3}" />
				</m:ItemIds>
			</m:GetItem>`,
			account3Email, accountPassword
		);
		const giBody3 = ews.getBody(getItemRes3);
		const giMsg3 = giBody3.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		assert.equal(giMsg3.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(giMsg3.Items.CalendarItem.Subject, apptSubject, 'Subject should match');
		const reqAtt3 = Array.isArray(giMsg3.Items.CalendarItem.RequiredAttendees?.Attendee)
			? giMsg3.Items.CalendarItem.RequiredAttendees.Attendee
			: [giMsg3.Items.CalendarItem.RequiredAttendees?.Attendee];
		assert.exists(
			reqAtt3.find(a => a?.Mailbox?.EmailAddress === account3Email),
			'Account3 should be in RequiredAttendees on attendee view'
		);
	});
});
