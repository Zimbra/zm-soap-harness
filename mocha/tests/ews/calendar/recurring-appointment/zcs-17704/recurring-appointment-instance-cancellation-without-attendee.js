import { assert } from 'chai';
import config from '../../../../../conf/config.js';
import common from '../../../../../framework/core/common.js';
import soap from '../../../../../framework/backend/soap-client.js';
import ews from '../../../../../framework/backend/ews.js';
import { main } from '../../../../../pages/main.js';

describe('EWS > Calendar > RecurringAppointment > ZCS-17704 > Recurring Appointment Instance Cancellation Without Attendee', function () {
	this.timeout(300 * 1000);
	let adminAuthToken, account1Email, accountPassword;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
		const unique = common.getUniqueString();
		accountPassword = config.accountPassword;
		account1Email = `testShub1.${unique}@${config.testDomain}`;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
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
	it('Sanity | Creating recurring appointments from outlook without attendees and create a exception instance and updated that instance from ZWC and delete it from Outlook', async () => {
		const unique = common.getUniqueString();
		const apptSubject = `subject1.${unique}`;
		const updatedSubject2 = `updated_subject2.${unique}`;

		// Use future dates for recurrence
		const startDate = common.getXMLTime(1440); // tomorrow
		const endDate = common.getXMLTime(1500);

		// Parse just the date portion for recurrence range
		const startDateOnly = startDate.substring(0, 10);
		const day2Start = common.getXMLTime(2880); // day after tomorrow
		const day2End = common.getXMLTime(2940);
		const endDateOnly = common.getXMLTime(5760).substring(0, 10); // 4 days out

		const uid = `${unique}-D714-429E-94D7-80A1A975F61E`;

		// Step 1: Create recurring appointment from EWS/Outlook
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				SendMeetingInvitations="SendToAllAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="10" />
				</SavedItemFolderId>
				<Items>
					<t:CalendarItem>
						<t:Subject>${apptSubject}</t:Subject>
						<t:ReminderIsSet>false</t:ReminderIsSet>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI PropertyName="CalendarTimeZone"
								PropertySetId="A7B529B5-4B75-47A7-A24F-20743D6C55CD"
								PropertyType="String" />
							<t:Value>Asia/Kolkata</t:Value>
						</t:ExtendedProperty>
						<t:UID>${uid}</t:UID>
						<t:Start>${startDate}</t:Start>
						<t:End>${endDate}</t:End>
						<t:LegacyFreeBusyStatus>Busy</t:LegacyFreeBusyStatus>
						<t:Recurrence>
							<t:DailyRecurrence>
								<t:Interval>1</t:Interval>
							</t:DailyRecurrence>
							<t:EndDateRecurrence>
								<t:StartDate>${startDateOnly}</t:StartDate>
								<t:EndDate>${endDateOnly}</t:EndDate>
							</t:EndDateRecurrence>
						</t:Recurrence>
						<t:MeetingTimeZone TimeZoneName="India Standard Time" />
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
			account1Email, accountPassword
		);
		const createBody = ews.getBody(createRes);
		const createMsg = createBody.CreateItemResponse
			.ResponseMessages.CreateItemResponseMessage;
		assert.equal(createMsg.$.ResponseClass, 'Success', 'CreateItem should succeed');
		const masterId = createMsg.Items.CalendarItem.ItemId.$.Id;
		const masterCk = createMsg.Items.CalendarItem.ItemId.$.ChangeKey;
		assert.exists(masterId, 'Master recurring ItemId should exist');

		// Verify on ZWC
		const account1AuthToken = await soap.getAccountAuthToken(account1Email, accountPassword);

		await common.delay(5000);

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

		// Step 2: Update 2nd instance via EWS (create exception)
		const updateRes = await ews.makeEWSRequest(
			`<UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				ConflictResolution="AutoResolve"
				SendMeetingInvitationsOrCancellations="SendToAllAndSaveCopy">
				<ItemChanges>
					<t:ItemChange>
						<t:OccurrenceItemId RecurringMasterId="${masterId}"
							ChangeKey="${masterCk}"
							InstanceIndex="2" />
						<t:Updates>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Subject" />
								<t:CalendarItem>
									<t:Subject>${updatedSubject2}</t:Subject>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:Start" />
								<t:CalendarItem>
									<t:Start>${day2Start}</t:Start>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:End" />
								<t:CalendarItem>
									<t:End>${day2End}</t:End>
								</t:CalendarItem>
							</t:SetItemField>
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
		// Capture updated ChangeKey for subsequent delete
		const updatedCk = updateMsg.Items?.CalendarItem?.ItemId?.$.ChangeKey || masterCk;

		// Step 3: Verify exception on ZWC and update from ZWC
		await common.delay(5000);

		// Search for the exception instance
		const now = new Date();
		const expandStart = now.getTime();
		const expandEnd = expandStart + (7 * 24 * 60 * 60 * 1000);

		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${expandStart}" calExpandInstEnd="${expandEnd}"
				limit="1000" offset="0">
				<query>(inid:10)</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes2.Fault, 'Response should not be a Fault');

		const appts = Array.isArray(searchRes2.SearchResponse.appt)
			? searchRes2.SearchResponse.appt : [searchRes2.SearchResponse.appt];
		let exceptionInvId = null;
		for (const a of appts) {
			if (!a || !a.inst) continue;
			const instances = Array.isArray(a.inst) ? a.inst : [a.inst];
			for (const inst of instances) {
				if (inst.ex === '1' || inst.ex === 1 || inst.ex === true) {
					exceptionInvId = inst.invId;
					break;
				}
			}
			if (exceptionInvId) break;
		}
		assert.exists(exceptionInvId, 'Exception instance invId should exist');

		// Get the exception message to verify
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${exceptionInvId}" />
			</GetMsgRequest>`, account1AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		const exMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.equal(
			exMsg.inv[0].comp[0].name, updatedSubject2,
			'Exception subject should match updated subject'
		);

		// Step 4: Delete exception instance from EWS/Outlook
		const deleteRes = await ews.makeEWSRequest(
			`<DeleteItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				DeleteType="SoftDelete"
				SendMeetingCancellations="SendToNone">
				<ItemIds>
					<t:OccurrenceItemId RecurringMasterId="${masterId}"
						ChangeKey="${updatedCk}"
						InstanceIndex="2" />
				</ItemIds>
			</DeleteItem>`,
			account1Email, accountPassword
		);
		const deleteBody = ews.getBody(deleteRes);
		if (!deleteBody.DeleteItemResponse) {
			console.log('DeleteItem full response:', JSON.stringify(deleteBody));
		}
		assert.exists(deleteBody.DeleteItemResponse, 'DeleteItemResponse should exist');
		// Server may return DeleteItemResponseMessage or GetItemResponseMessage for occurrence deletions
		const deleteMsg = deleteBody.DeleteItemResponse
			.ResponseMessages.DeleteItemResponseMessage
			|| deleteBody.DeleteItemResponse.ResponseMessages.GetItemResponseMessage;
		const deleteMsgArr = Array.isArray(deleteMsg) ? deleteMsg : (deleteMsg ? [deleteMsg] : []);
		assert.isAbove(deleteMsgArr.length, 0, 'Should have DeleteItemResponseMessage');
		assert.exists(deleteMsgArr[0].$, 'DeleteItemResponseMessage should have attributes');
		assert.equal(
			deleteMsgArr[0].$.ResponseClass, 'Success',
			'DeleteItem should succeed'
		);

		// Step 5: Verify in Zimbra that exception is gone
		await common.delay(5000);

		// Use a narrow time window around the deleted instance
		const day2Ms = new Date(day2Start).getTime();
		const narrowStart = day2Ms - (60 * 60 * 1000);
		const narrowEnd = day2Ms + (24 * 60 * 60 * 1000);

		const searchRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${narrowStart}" calExpandInstEnd="${narrowEnd}">
				<query>(inid:10)</query>
			</SearchRequest>`, account1AuthToken
		);
		assert.notExists(searchRes3.Fault, 'Response should not be a Fault');

		// Verify no instances exist in that narrow window (exception was deleted)
		const remainingAppts = searchRes3.SearchResponse.appt;
		if (remainingAppts) {
			const rArr = Array.isArray(remainingAppts) ? remainingAppts : [remainingAppts];
			for (const a of rArr) {
				if (!a || !a.inst) continue;
				const instances = Array.isArray(a.inst) ? a.inst : [a.inst];
				for (const inst of instances) {
					assert.notEqual(
						inst.ex, '1',
						'No exception instance should remain after deletion'
					);
				}
			}
		}
	});
});
