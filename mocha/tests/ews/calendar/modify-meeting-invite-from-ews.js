import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import ews from '../../../framework/backend/ews.js';
import { main } from '../../../pages/main.js';

describe('EWS > Calendar > Modify Meeting Invite From EWS', function () {
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
	it('Sanity | Send a meeting invite from ZWC organizer, modify meeting time from EWS Organizer and Sync on ZWC Organizer, attendee for modified meeting time', async () => {
		const unique = common.getUniqueString();
		const apptSubject = `subject1.${unique}`;
		const apptContent = 'Test appointment sent from ZWC for time modification test';

		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);

		const time1 = common.getICALTime(30);
		const time2 = common.getICALTime(60);
		const newTime1 = common.getXMLTime(60);
		const newTime2 = common.getXMLTime(90);
		const startTime1 = common.getGMTTime(60);

		// ZWC organizer creates meeting
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${apptSubject}">
							<or a="${account1Email}" />
							<at a="${account2Email}" role="REQ" ptst="NE" rsvp="1" />
							<s d="${time1}" />
							<e d="${time2}" />
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
		assert.exists(createRes.CreateAppointmentResponse, 'CreateAppointmentResponse should exist');

		// EWS organizer syncs calendar folder to get the item
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
				<MaxChangesReturned>512</MaxChangesReturned>
				<SyncScope>NormalAndAssociatedItems</SyncScope>
			</SyncFolderItems>`,
			account1Email, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		assert.equal(syncMsg.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMsg.Changes.Create)
			? syncMsg.Changes.Create : [syncMsg.Changes.Create];
		const calCreate = creates.find(c => c?.CalendarItem);
		const calId = calCreate?.CalendarItem?.ItemId?.$.Id;
		const calCk = calCreate?.CalendarItem?.ItemId?.$.ChangeKey;
		assert.exists(calId, 'Calendar item Id should exist');
		const syncState1 = syncMsg.SyncState;

		// EWS GetItem to verify subject and get times
		const getItemRes1 = await ews.makeEWSRequest(
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
		const giBody1 = ews.getBody(getItemRes1);
		const giMsg1 = giBody1.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		assert.equal(giMsg1.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(giMsg1.Items.CalendarItem.Subject, apptSubject, 'Subject should match');

		// EWS organizer modifies meeting time via UpdateItem
		const updateRes = await ews.makeEWSRequest(
			`<UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				ConflictResolution="AutoResolve"
				MessageDisposition="SaveOnly"
				SendMeetingInvitationsOrCancellations="SendToAllAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="10" />
				</SavedItemFolderId>
				<ItemChanges>
					<t:ItemChange>
						<t:ItemId Id="${calId}" ChangeKey="${calCk}" />
						<t:Updates>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Subject" />
								<t:CalendarItem>
									<t:Subject>${apptSubject}</t:Subject>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Body" />
								<t:CalendarItem>
									<t:Body BodyType="HTML">${apptContent}</t:Body>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Sensitivity" />
								<t:CalendarItem>
									<t:Sensitivity>Normal</t:Sensitivity>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Importance" />
								<t:CalendarItem>
									<t:Importance>Normal</t:Importance>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:Start" />
								<t:CalendarItem>
									<t:Start>${newTime1}</t:Start>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:End" />
								<t:CalendarItem>
									<t:End>${newTime2}</t:End>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:LegacyFreeBusyStatus" />
								<t:CalendarItem>
									<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:IsResponseRequested" />
								<t:CalendarItem>
									<t:IsResponseRequested>true</t:IsResponseRequested>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:AllowNewTimeProposal" />
								<t:CalendarItem>
									<t:AllowNewTimeProposal>true</t:AllowNewTimeProposal>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:RequiredAttendees" />
								<t:CalendarItem>
									<t:RequiredAttendees>
										<t:Attendee>
											<t:Mailbox>
												<t:EmailAddress>${account2Email}</t:EmailAddress>
											</t:Mailbox>
											<t:ResponseType>NoResponseReceived</t:ResponseType>
										</t:Attendee>
									</t:RequiredAttendees>
								</t:CalendarItem>
							</t:SetItemField>
							<t:DeleteItemField>
								<t:FieldURI FieldURI="calendar:Recurrence" />
							</t:DeleteItemField>
							<t:DeleteItemField>
								<t:FieldURI FieldURI="calendar:OptionalAttendees" />
							</t:DeleteItemField>
							<t:DeleteItemField>
								<t:FieldURI FieldURI="calendar:Resources" />
							</t:DeleteItemField>
							<t:DeleteItemField>
								<t:FieldURI FieldURI="item:Categories" />
							</t:DeleteItemField>
						</t:Updates>
					</t:ItemChange>
				</ItemChanges>
			</UpdateItem>`,
			account1Email, accountPassword
		);
		const updateBody = ews.getBody(updateRes);
		const updateMsg = updateBody.UpdateItemResponse
			.ResponseMessages.UpdateItemResponseMessage;
		assert.equal(updateMsg.$.ResponseClass, 'Success', 'UpdateItem should succeed');

		// EWS organizer syncs to get updated item
		const syncRes2 = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="10" />
				</SyncFolderId>
				<SyncState>${syncState1}</SyncState>
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
		const cal2Id = calUpdate?.CalendarItem?.ItemId?.$.Id;
		const cal2Ck = calUpdate?.CalendarItem?.ItemId?.$.ChangeKey;
		assert.exists(cal2Id, 'Updated calendar item Id should exist');

		// EWS GetItem to verify modified time
		const getItemRes2 = await ews.makeEWSRequest(
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
					<t:ItemId Id="${cal2Id}" ChangeKey="${cal2Ck}" />
				</m:ItemIds>
			</m:GetItem>`,
			account1Email, accountPassword
		);
		const giBody2 = ews.getBody(getItemRes2);
		const giMsg2 = giBody2.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		assert.equal(giMsg2.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(giMsg2.Items.CalendarItem.Subject, apptSubject, 'Subject should match');

		// Verify on ZWC organizer
		await common.delay(8000);
		const searchRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes1.Fault, 'Response should not be a Fault');
		const appt1 = Array.isArray(searchRes1.SearchResponse.appt)
			? searchRes1.SearchResponse.appt[0] : searchRes1.SearchResponse.appt;
		assert.equal(appt1.name, apptSubject, 'Appointment name should match');
		const inst1 = Array.isArray(appt1.inst) ? appt1.inst[0] : appt1.inst;
		assert.equal(inst1.ridZ, startTime1, 'Instance ridZ should match modified start time');
		const invId1 = appt1.invId;

		const getMsgRes1 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId1}" />
			</GetMsgRequest>`, account1AuthToken
		);
		assert.notExists(getMsgRes1.Fault, 'Response should not be a Fault');
		const comp1 = Array.isArray(getMsgRes1.GetMsgResponse.m)
			? getMsgRes1.GetMsgResponse.m[0] : getMsgRes1.GetMsgResponse.m;
		const invComp1 = comp1.inv[0].comp[0];
		assert.equal(invComp1.name, apptSubject, 'Appointment comp name should match');

		// Verify on ZWC attendee
		const acct2AuthToken = await soap.getAccountAuthToken(account2Email, accountPassword);
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes2.Fault, 'Response should not be a Fault');
		const appt2 = Array.isArray(searchRes2.SearchResponse.appt)
			? searchRes2.SearchResponse.appt[0] : searchRes2.SearchResponse.appt;
		assert.equal(appt2.name, apptSubject, 'Attendee appointment name should match');
		const inst2 = Array.isArray(appt2.inst) ? appt2.inst[0] : appt2.inst;
		assert.equal(inst2.ridZ, startTime1, 'Attendee instance ridZ should match modified start time');
		const invId2 = appt2.invId;

		const getMsgRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId2}" />
			</GetMsgRequest>`, acct2AuthToken
		);
		assert.notExists(getMsgRes2.Fault, 'Response should not be a Fault');
		const comp2 = Array.isArray(getMsgRes2.GetMsgResponse.m)
			? getMsgRes2.GetMsgResponse.m[0] : getMsgRes2.GetMsgResponse.m;
		const invComp2 = comp2.inv[0].comp[0];
		assert.equal(invComp2.name, apptSubject, 'Attendee appointment comp name should match');
	});


	it('Sanity | Send a meeting invite from ZWC organizer, modified attendee list-adds new attendee, removes existing attendee from EWS Organizer and Sync on ZWC Organizer, attendee for modified attendee list', async () => {
		const unique = common.getUniqueString();
		const apptSubject = `subject2.${unique}`;
		const apptContent = 'Test appointment sent from ZWC for attendee modification test';

		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);

		const time3 = common.getICALTime(-60);
		const time4 = common.getICALTime(-30);
		const xmlTime3 = common.getXMLTime(-60);
		const xmlTime4 = common.getXMLTime(-30);

		// ZWC organizer creates meeting with account2 as attendee
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="0"
							name="${apptSubject}">
							<or a="${account1Email}" />
							<at a="${account2Email}" role="REQ" ptst="NE" rsvp="1" />
							<s d="${time3}" />
							<e d="${time4}" />
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
		assert.exists(createRes.CreateAppointmentResponse, 'CreateAppointmentResponse should exist');

		// EWS organizer syncs calendar folder
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
				<MaxChangesReturned>512</MaxChangesReturned>
				<SyncScope>NormalAndAssociatedItems</SyncScope>
			</SyncFolderItems>`,
			account1Email, accountPassword
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg = syncBody.SyncFolderItemsResponse
			.ResponseMessages.SyncFolderItemsResponseMessage;
		assert.equal(syncMsg.$.ResponseClass, 'Success', 'SyncFolderItems should succeed');
		const creates = Array.isArray(syncMsg.Changes.Create)
			? syncMsg.Changes.Create : [syncMsg.Changes.Create];
		const cFiltered = creates.filter(c => c?.CalendarItem);
		const calCreate = cFiltered[cFiltered.length - 1];
		const calId = calCreate?.CalendarItem?.ItemId?.$.Id;
		const calCk = calCreate?.CalendarItem?.ItemId?.$.ChangeKey;
		assert.exists(calId, 'Calendar item Id should exist');
		const syncState1 = syncMsg.SyncState;

		// EWS GetItem to verify subject and attendee
		const getItemRes1 = await ews.makeEWSRequest(
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
		const giBody1 = ews.getBody(getItemRes1);
		const giMsg1 = giBody1.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		assert.equal(giMsg1.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(giMsg1.Items.CalendarItem.Subject, apptSubject, 'Subject should match');
		const reqAtt1 = Array.isArray(giMsg1.Items.CalendarItem.RequiredAttendees?.Attendee)
			? giMsg1.Items.CalendarItem.RequiredAttendees.Attendee
			: [giMsg1.Items.CalendarItem.RequiredAttendees?.Attendee];
		assert.exists(
			reqAtt1.find(a => a?.Mailbox?.EmailAddress === account2Email),
			'Account2 should be in RequiredAttendees'
		);

		// EWS organizer modifies attendee list - replaces account2 with account3
		const updateRes = await ews.makeEWSRequest(
			`<UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				ConflictResolution="AutoResolve"
				MessageDisposition="SaveOnly"
				SendMeetingInvitationsOrCancellations="SendToAllAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="10" />
				</SavedItemFolderId>
				<ItemChanges>
					<t:ItemChange>
						<t:ItemId Id="${calId}" ChangeKey="${calCk}" />
						<t:Updates>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Subject" />
								<t:CalendarItem>
									<t:Subject>${apptSubject}</t:Subject>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Body" />
								<t:CalendarItem>
									<t:Body BodyType="HTML">${apptContent}</t:Body>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Sensitivity" />
								<t:CalendarItem>
									<t:Sensitivity>Normal</t:Sensitivity>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Importance" />
								<t:CalendarItem>
									<t:Importance>Normal</t:Importance>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:Start" />
								<t:CalendarItem>
									<t:Start>${xmlTime3}</t:Start>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:End" />
								<t:CalendarItem>
									<t:End>${xmlTime4}</t:End>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:LegacyFreeBusyStatus" />
								<t:CalendarItem>
									<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:IsResponseRequested" />
								<t:CalendarItem>
									<t:IsResponseRequested>true</t:IsResponseRequested>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:AllowNewTimeProposal" />
								<t:CalendarItem>
									<t:AllowNewTimeProposal>true</t:AllowNewTimeProposal>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:RequiredAttendees" />
								<t:CalendarItem>
									<t:RequiredAttendees>
										<t:Attendee>
											<t:Mailbox>
												<t:EmailAddress>${account3Email}</t:EmailAddress>
											</t:Mailbox>
											<t:ResponseType>NoResponseReceived</t:ResponseType>
										</t:Attendee>
									</t:RequiredAttendees>
								</t:CalendarItem>
							</t:SetItemField>
							<t:DeleteItemField>
								<t:FieldURI FieldURI="calendar:Recurrence" />
							</t:DeleteItemField>
							<t:DeleteItemField>
								<t:FieldURI FieldURI="calendar:OptionalAttendees" />
							</t:DeleteItemField>
							<t:DeleteItemField>
								<t:FieldURI FieldURI="calendar:Resources" />
							</t:DeleteItemField>
							<t:DeleteItemField>
								<t:FieldURI FieldURI="item:Categories" />
							</t:DeleteItemField>
						</t:Updates>
					</t:ItemChange>
				</ItemChanges>
			</UpdateItem>`,
			account1Email, accountPassword
		);
		const updateBody = ews.getBody(updateRes);
		const updateMsg = updateBody.UpdateItemResponse
			.ResponseMessages.UpdateItemResponseMessage;
		assert.equal(updateMsg.$.ResponseClass, 'Success', 'UpdateItem should succeed');

		// EWS organizer syncs to get updated item
		const syncRes2 = await ews.makeEWSRequest(
			`<SyncFolderItems xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
					<t:IncludeMimeContent>false</t:IncludeMimeContent>
				</ItemShape>
				<SyncFolderId>
					<t:FolderId Id="10" />
				</SyncFolderId>
				<SyncState>${syncState1}</SyncState>
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
		const ewsUpdates = syncMsg2.Changes?.Update;
		const updateArr = Array.isArray(ewsUpdates) ? ewsUpdates : [ewsUpdates];
		const calUpdate = updateArr.find(u => u?.CalendarItem);
		const cal2Id = calUpdate?.CalendarItem?.ItemId?.$.Id;
		const cal2Ck = calUpdate?.CalendarItem?.ItemId?.$.ChangeKey;
		assert.exists(cal2Id, 'Updated calendar item Id should exist');

		// EWS GetItem to verify modified attendee
		const getItemRes2 = await ews.makeEWSRequest(
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
					<t:ItemId Id="${cal2Id}" ChangeKey="${cal2Ck}" />
				</m:ItemIds>
			</m:GetItem>`,
			account1Email, accountPassword
		);
		const giBody2 = ews.getBody(getItemRes2);
		const giMsg2 = giBody2.GetItemResponse
			.ResponseMessages.GetItemResponseMessage;
		assert.equal(giMsg2.$.ResponseClass, 'Success', 'GetItem should succeed');
		assert.equal(giMsg2.Items.CalendarItem.Subject, apptSubject, 'Subject should match');
		const reqAtt2 = Array.isArray(giMsg2.Items.CalendarItem.RequiredAttendees?.Attendee)
			? giMsg2.Items.CalendarItem.RequiredAttendees.Attendee
			: [giMsg2.Items.CalendarItem.RequiredAttendees?.Attendee];
		assert.exists(
			reqAtt2.find(a => a?.Mailbox?.EmailAddress === account3Email),
			'Account3 should be in RequiredAttendees after modification'
		);

		// Verify on ZWC organizer
		await common.delay(8000);
		const searchRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes1.Fault, 'Response should not be a Fault');
		const appt1 = Array.isArray(searchRes1.SearchResponse.appt)
			? searchRes1.SearchResponse.appt[0] : searchRes1.SearchResponse.appt;
		assert.equal(appt1.name, apptSubject, 'Appointment name should match');
		const invId1 = appt1.invId;

		const getMsgRes1 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId1}" />
			</GetMsgRequest>`, account1AuthToken
		);
		assert.notExists(getMsgRes1.Fault, 'Response should not be a Fault');
		const comp1 = Array.isArray(getMsgRes1.GetMsgResponse.m)
			? getMsgRes1.GetMsgResponse.m[0] : getMsgRes1.GetMsgResponse.m;
		const invComp1 = comp1.inv[0].comp[0];
		assert.equal(invComp1.name, apptSubject, 'Appointment comp name should match');
		const attendees1 = Array.isArray(invComp1.at) ? invComp1.at : [invComp1.at];
		assert.exists(
			attendees1.find(a => a?.a === account3Email),
			'Account3 should be in attendees on ZWC organizer'
		);

		// Verify on ZWC new attendee (account3)
		const acct3AuthToken = await soap.getAccountAuthToken(account3Email, accountPassword);
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${apptSubject}</query>
			</SearchRequest>`, acct3AuthToken
		);
		assert.notExists(searchRes2.Fault, 'Response should not be a Fault');
		const appt2 = Array.isArray(searchRes2.SearchResponse.appt)
			? searchRes2.SearchResponse.appt[0] : searchRes2.SearchResponse.appt;
		assert.equal(appt2.name, apptSubject, 'New attendee appointment name should match');
		const invId2 = appt2.invId;

		const getMsgRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId2}" />
			</GetMsgRequest>`, acct3AuthToken
		);
		assert.notExists(getMsgRes2.Fault, 'Response should not be a Fault');
		const comp2 = Array.isArray(getMsgRes2.GetMsgResponse.m)
			? getMsgRes2.GetMsgResponse.m[0] : getMsgRes2.GetMsgResponse.m;
		const invComp2 = comp2.inv[0].comp[0];
		assert.equal(invComp2.name, apptSubject, 'New attendee appointment comp name should match');
		const attendees2 = Array.isArray(invComp2.at) ? invComp2.at : [invComp2.at];
		assert.exists(
			attendees2.find(a => a?.a === account3Email),
			'Account3 should be in attendees on new attendee view'
		);
	});
});
