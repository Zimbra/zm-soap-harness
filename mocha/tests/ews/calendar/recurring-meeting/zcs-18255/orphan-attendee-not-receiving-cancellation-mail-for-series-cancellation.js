import { assert } from 'chai';
import config from '../../../../../conf/config.js';
import common from '../../../../../framework/core/common.js';
import soap from '../../../../../framework/backend/soap-client.js';
import ews from '../../../../../framework/backend/ews.js';
import { main } from '../../../../../pages/main.js';

describe('EWS > Calendar > RecurringMeeting > ZCS-18255 > Orphan Attendee Not Receiving Cancellation Mail For Series Cancellation', function () {
	this.timeout(300 * 1000);
	let adminAuthToken,
		account1Email,
		account2Email,
		account3Email,
		accountPassword;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
		const unique = common.getUniqueString();
		accountPassword = 'test123';
		account1Email = `testAccount1.${unique}@${config.testDomain}`;
		account2Email = `testAccount2.${unique}@${config.testDomain}`;
		account3Email = `testAccount3.${unique}@${config.testDomain}`;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`,
			adminAuthToken,
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`,
			adminAuthToken,
		);

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`,
			adminAuthToken,
		);
	});

	// Applicable zimbra versions
	if (
		config.serial === true ||
		!String(config.serverEnvironment)
			.toUpperCase()
			.match(/ZIMBRA101|ZIMBRAX/)
	) {
		return;
	}

	// Tests
	it('Sanity | Create a recurring meeting in Outlook (EWS) show all instances in ZWC When an occurrence is modified (exception) and then series get cancelled from Outlook, the orphan attendees should receive the cancellation mail', async () => {
		const unique = common.getUniqueString();
		const subject1 = `subject1.${unique}`;
		const updatedSubject2 = `updated_subject2.${unique}`;
		const uid = `${unique}-D714-429E-94D7-80A1A975F61E`;

		// Use future dates for recurrence
		const startDate = common.getXMLTime(1440); // tomorrow
		const endDate = common.getXMLTime(1500);
		const startDateOnly = startDate.substring(0, 10);
		const endDateOnly = common.getXMLTime(4320).substring(0, 10); // 3 days out
		const day2Start = common.getXMLTime(2880);
		const day2End = common.getXMLTime(2940);

		// Step 1: Create a recurring meeting from Outlook
		const createRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SaveOnly"
				SendMeetingInvitations="SendToAllAndSaveCopy">
				<SavedItemFolderId>
					<t:FolderId Id="10" />
				</SavedItemFolderId>
				<Items>
					<t:CalendarItem>
						<t:Subject>${subject1}</t:Subject>
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
						<t:RequiredAttendees>
							<t:Attendee>
								<t:Mailbox>
									<t:Name>${account2Email.split('@')[0]}</t:Name>
									<t:EmailAddress>${account2Email}</t:EmailAddress>
								</t:Mailbox>
							</t:Attendee>
						</t:RequiredAttendees>
					</t:CalendarItem>
				</Items>
			</CreateItem>`,
			account1Email,
			accountPassword,
		);
		const createBody = ews.getBody(createRes);
		const createMsg =
			createBody.CreateItemResponse.ResponseMessages.CreateItemResponseMessage;
		assert.equal(
			createMsg.ResponseClass,
			'Success',
			'CreateItem should succeed',
		);
		const masterId = createMsg.Items.CalendarItem.ItemId.Id;
		const masterCk = createMsg.Items.CalendarItem.ItemId.ChangeKey;
		assert.exists(masterId, 'Master recurring ItemId should exist');

		// SyncFolderItems to get latest state
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
			account1Email,
			accountPassword,
		);
		const syncBody = ews.getBody(syncRes);
		const syncMsg =
			syncBody.SyncFolderItemsResponse.ResponseMessages
				.SyncFolderItemsResponseMessage;
		assert.equal(
			syncMsg.ResponseClass,
			'Success',
			'SyncFolderItems should succeed',
		);

		// Verify on ZWC
		const account1AuthToken = await soap.getAccountAuthToken(
			account1Email,
			accountPassword,
		);

		await common.delay(5000);

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>subject:${subject1}</query>
			</SearchRequest>`,
			account1AuthToken,
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appt = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt[0]
			: searchRes.SearchResponse.appt;
		const invId = appt.invId;
		assert.exists(invId, 'Appointment invId should exist');

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}" />
			</GetMsgRequest>`,
			account1AuthToken,
		);
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');

		// Step 2: Accept the meeting invitation as account2
		const acceptRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy"
				SendMeetingInvitations="SendToAllAndSaveCopy">
				<Items>
					<t:AcceptItem>
						<t:ReferenceItemId Id="${masterId}" />
					</t:AcceptItem>
				</Items>
			</CreateItem>`,
			account2Email,
			accountPassword,
		);
		const acceptBody = ews.getBody(acceptRes);
		const acceptMsg =
			acceptBody.CreateItemResponse.ResponseMessages.CreateItemResponseMessage;
		assert.equal(
			acceptMsg.ResponseClass,
			'Success',
			'AcceptItem should succeed',
		);

		// SyncFolderItems again
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
				<MaxChangesReturned>100</MaxChangesReturned>
			</SyncFolderItems>`,
			account1Email,
			accountPassword,
		);
		const syncBody2 = ews.getBody(syncRes2);
		const syncMsg2 =
			syncBody2.SyncFolderItemsResponse.ResponseMessages
				.SyncFolderItemsResponseMessage;
		assert.equal(
			syncMsg2.ResponseClass,
			'Success',
			'SyncFolderItems should succeed',
		);

		// Step 3: Update the 2nd occurrence (create exception) with orphan attendee
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
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:RequiredAttendees" />
								<t:CalendarItem>
									<t:RequiredAttendees>
										<t:Attendee>
											<t:Mailbox>
												<t:Name>${account2Email.split('@')[0]}</t:Name>
												<t:EmailAddress>${account2Email}</t:EmailAddress>
											</t:Mailbox>
										</t:Attendee>
										<t:Attendee>
											<t:Mailbox>
												<t:Name>${account3Email.split('@')[0]}</t:Name>
												<t:EmailAddress>${account3Email}</t:EmailAddress>
											</t:Mailbox>
										</t:Attendee>
									</t:RequiredAttendees>
								</t:CalendarItem>
							</t:SetItemField>
						</t:Updates>
					</t:ItemChange>
				</ItemChanges>
			</UpdateItem>`,
			account1Email,
			accountPassword,
		);
		const updateBody = ews.getBody(updateRes);
		const updateMsg =
			updateBody.UpdateItemResponse.ResponseMessages.UpdateItemResponseMessage;
		assert.equal(
			updateMsg.ResponseClass,
			'Success',
			'UpdateItem (exception) should succeed',
		);

		// Step 4: Verify exception in ZWC
		await common.delay(5000);

		const now = new Date();
		const expandStart = now.getTime();
		const expandEnd = expandStart + 30 * 24 * 60 * 60 * 1000;

		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${expandStart}" calExpandInstEnd="${expandEnd}"
				limit="1000" offset="0">
				<query>(inid:"10")</query>
			</SearchRequest>`,
			account1AuthToken,
		);
		assert.notExists(searchRes2.Fault, 'Response should not be a Fault');
		const appts = Array.isArray(searchRes2.SearchResponse.appt)
			? searchRes2.SearchResponse.appt
			: [searchRes2.SearchResponse.appt];
		let exceptionInvId = null;
		for (const a of appts) {
			if (!a || !a.inst) continue;
			const instances = Array.isArray(a.inst) ? a.inst : [a.inst];
			for (const inst of instances) {
				if (inst.ex === '1' || inst.ex === 1) {
					exceptionInvId = inst.invId;
					break;
				}
			}
			if (exceptionInvId) break;
		}
		assert.exists(exceptionInvId, 'Exception instance invId should exist');

		const getMsgRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${exceptionInvId}" />
			</GetMsgRequest>`,
			account1AuthToken,
		);
		assert.notExists(getMsgRes2.Fault, 'Response should not be a Fault');
		const exMsg = Array.isArray(getMsgRes2.GetMsgResponse.m)
			? getMsgRes2.GetMsgResponse.m[0]
			: getMsgRes2.GetMsgResponse.m;
		const exInv = Array.isArray(exMsg.inv) ? exMsg.inv[0] : exMsg.inv;
		const exComp = Array.isArray(exInv.comp) ? exInv.comp[0] : exInv.comp;
		assert.equal(
			exComp.name,
			updatedSubject2,
			'Exception subject should match',
		);

		// Step 5: Get the recurring master via EWS GetItem (for series cancellation)
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>AllProperties</t:BaseShape>
				</ItemShape>
				<ItemIds>
					<t:ItemId Id="${masterId}" ChangeKey="${masterCk}" />
				</ItemIds>
			</GetItem>`,
			account1Email,
			accountPassword,
		);
		const getItemBody = ews.getBody(getItemRes);
		const getItemMsg =
			getItemBody.GetItemResponse.ResponseMessages.GetItemResponseMessage;
		assert.equal(getItemMsg.ResponseClass, 'Success', 'GetItem should succeed');
		const cancelTargetId = getItemMsg.Items.CalendarItem.ItemId.Id;
		const cancelTargetCk = getItemMsg.Items.CalendarItem.ItemId.ChangeKey;
		assert.exists(cancelTargetId, 'Master ItemId should exist');

		// Step 6: Cancel the entire series from Outlook
		const cancelRes = await ews.makeEWSRequest(
			`<CreateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				MessageDisposition="SendAndSaveCopy"
				SendMeetingInvitations="SendToAllAndSaveCopy">
				<Items>
					<t:CancelCalendarItem>
						<t:ReferenceItemId Id="${cancelTargetId}"
							ChangeKey="${cancelTargetCk}" />
					</t:CancelCalendarItem>
				</Items>
			</CreateItem>`,
			account1Email,
			accountPassword,
		);
		const cancelBody = ews.getBody(cancelRes);
		const cancelMsg =
			cancelBody.CreateItemResponse.ResponseMessages.CreateItemResponseMessage;
		assert.equal(
			cancelMsg.ResponseClass,
			'Success',
			'CancelCalendarItem should succeed',
		);

		// Step 7: Verify in Zimbra that the series is cancelled
		await common.delay(5000);

		const searchRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${expandStart}" calExpandInstEnd="${expandEnd}">
				<query>(inid:"10")</query>
			</SearchRequest>`,
			account1AuthToken,
		);
		assert.notExists(searchRes3.Fault, 'Response should not be a Fault');

		// Since the series is cancelled, no master and no instances should appear
		const remainingAppts = searchRes3.SearchResponse.appt;
		if (remainingAppts) {
			const rArr = Array.isArray(remainingAppts)
				? remainingAppts
				: [remainingAppts];
			// Filter for our subject only
			const matchingAppts = rArr.filter((a) => a && a.name === subject1);
			assert.equal(
				matchingAppts.length,
				0,
				'No appointments with the series subject should remain',
			);
		}

		// Step 8: Verify original attendee (account2) received cancellation mail
		const account2AuthToken = await soap.getAccountAuthToken(
			account2Email,
			accountPassword,
		);

		await common.delay(5000);

		const searchRes4 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:${subject1}</query>
			</SearchRequest>`,
			account2AuthToken,
		);
		assert.notExists(searchRes4.Fault, 'Response should not be a Fault');
		const cancelMail = Array.isArray(searchRes4.SearchResponse.m)
			? searchRes4.SearchResponse.m[0]
			: searchRes4.SearchResponse.m;
		assert.exists(cancelMail, 'Cancellation mail should exist for attendee');

		const getMsgRes3 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${cancelMail.id}" />
			</GetMsgRequest>`,
			account2AuthToken,
		);
		assert.notExists(getMsgRes3.Fault, 'Response should not be a Fault');
		const cancelMailMsg = Array.isArray(getMsgRes3.GetMsgResponse.m)
			? getMsgRes3.GetMsgResponse.m[0]
			: getMsgRes3.GetMsgResponse.m;
		assert.include(
			cancelMailMsg.su,
			`Cancelled: ${subject1}`,
			'Cancellation mail subject should include series subject',
		);
		const cancelInv = Array.isArray(cancelMailMsg.inv)
			? cancelMailMsg.inv[0]
			: cancelMailMsg.inv;
		const cancelComp = Array.isArray(cancelInv.comp)
			? cancelInv.comp[0]
			: cancelInv.comp;
		assert.equal(cancelComp.method, 'CANCEL', 'Should have CANCEL method');

		// Step 9: Verify orphan attendee (account3) also received cancellation mail
		const account3AuthToken = await soap.getAccountAuthToken(
			account3Email,
			accountPassword,
		);

		await common.delay(5000);

		const searchRes5 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:${subject1}</query>
			</SearchRequest>`,
			account3AuthToken,
		);
		assert.notExists(searchRes5.Fault, 'Response should not be a Fault');
		const orphanCancelMail = Array.isArray(searchRes5.SearchResponse.m)
			? searchRes5.SearchResponse.m[0]
			: searchRes5.SearchResponse.m;
		assert.exists(
			orphanCancelMail,
			'Cancellation mail should exist for orphan attendee',
		);

		const getMsgRes4 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${orphanCancelMail.id}" />
			</GetMsgRequest>`,
			account3AuthToken,
		);
		assert.notExists(getMsgRes4.Fault, 'Response should not be a Fault');
		const orphanCancelMsg = Array.isArray(getMsgRes4.GetMsgResponse.m)
			? getMsgRes4.GetMsgResponse.m[0]
			: getMsgRes4.GetMsgResponse.m;
		assert.include(
			orphanCancelMsg.su,
			`Cancelled: ${subject1}`,
			'Orphan attendee cancellation mail subject should include series subject',
		);
		const orphanInv = Array.isArray(orphanCancelMsg.inv)
			? orphanCancelMsg.inv[0]
			: orphanCancelMsg.inv;
		const orphanComp = Array.isArray(orphanInv.comp)
			? orphanInv.comp[0]
			: orphanInv.comp;
		assert.equal(orphanComp.method, 'CANCEL', 'Should have CANCEL method');
	});
});
