import { assert } from 'chai';
import config from '../../../../../conf/config.js';
import common from '../../../../../framework/core/common.js';
import soap from '../../../../../framework/backend/soap-client.js';
import ews from '../../../../../framework/backend/ews.js';
import { main } from '../../../../../pages/main.js';

describe('EWS > Calendar > RecurringMeeting > ZCS-17709 > Recurring Meeting Exception Instance Cancellation After ZWC Update', function () {
	this.timeout(300 * 1000);
	let adminAuthToken, account1Email, account2Email, accountPassword;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
		const unique = common.getUniqueString();
		accountPassword = 'test123';
		account1Email = `testAccount1.${unique}@${config.testDomain}`;
		account2Email = `testAccount2.${unique}@${config.testDomain}`;

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
	it('Sanity | Create recurring meeting, create an exception, update from ZWC, then delete instance from Outlook and verify removal in Zimbra', async () => {
		const unique = common.getUniqueString();
		const subject1 = `subject1.${unique}`;
		const updatedSubject2 = `updated_subject2.${unique}`;

		const uid = `${unique}-D714-429E-94D7-80A1A975F61E`;

		// Use future dates for recurrence
		const startDate = common.getXMLTime(1440); // tomorrow
		const endDate = common.getXMLTime(1500);
		const startDateOnly = startDate.substring(0, 10);
		const endDateOnly = common.getXMLTime(5760).substring(0, 10); // 4 days out

		// Step 1: Create recurring meeting via EWS
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

		await common.delay(2000);

		// Step 2: CreateAttachment to add a file onto the meeting
		const attachRes = await ews.makeEWSRequest(
			`<CreateAttachment xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ParentItemId Id="${masterId}" ChangeKey="${masterCk}" />
				<Attachments>
					<t:FileAttachment>
						<t:Name>test.txt</t:Name>
						<t:ContentType>text/plain</t:ContentType>
						<t:Content>VGVzdCBhdHRhY2htZW50IGNvbnRlbnQ=</t:Content>
					</t:FileAttachment>
				</Attachments>
			</CreateAttachment>`,
			account1Email,
			accountPassword,
		);
		const attachBody = ews.getBody(attachRes);
		const attachMsg =
			attachBody.CreateAttachmentResponse.ResponseMessages
				.CreateAttachmentResponseMessage;
		assert.equal(
			attachMsg.ResponseClass,
			'Success',
			'CreateAttachment should succeed',
		);
		const masterCk2 =
			attachMsg.Attachments.FileAttachment.AttachmentId.RootItemChangeKey;
		assert.exists(masterCk2, 'Updated ChangeKey should exist after attachment');

		await common.delay(1000);

		// Step 3: UpdateItem to finalize new ChangeKey on the meeting
		const updateCkRes = await ews.makeEWSRequest(
			`<UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				SendMeetingInvitationsOrCancellations="SendToNone"
				MessageDisposition="SaveOnly"
				ConflictResolution="AlwaysOverwrite">
				<ItemChanges>
					<t:ItemChange>
						<t:ItemId Id="${masterId}" ChangeKey="${masterCk2}" />
						<t:Updates>
							<t:SetItemField>
								<t:FieldURI FieldURI="item:Subject" />
								<t:CalendarItem>
									<t:Subject>${subject1}</t:Subject>
								</t:CalendarItem>
							</t:SetItemField>
						</t:Updates>
					</t:ItemChange>
				</ItemChanges>
			</UpdateItem>`,
			account1Email,
			accountPassword,
		);
		const updateCkBody = ews.getBody(updateCkRes);
		const updateCkMsg =
			updateCkBody.UpdateItemResponse.ResponseMessages
				.UpdateItemResponseMessage;
		assert.equal(
			updateCkMsg.ResponseClass,
			'Success',
			'UpdateItem should succeed',
		);

		await common.delay(3000);

		// Step 4: Create exception (update occurrence #2) via EWS
		const day2Start = common.getXMLTime(2880);
		const day2End = common.getXMLTime(2940);

		const updateRes = await ews.makeEWSRequest(
			`<UpdateItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages"
				ConflictResolution="AutoResolve"
				SendMeetingInvitationsOrCancellations="SendToAllAndSaveCopy">
				<ItemChanges>
					<t:ItemChange>
						<t:OccurrenceItemId RecurringMasterId="${masterId}"
							ChangeKey="${masterCk2}"
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

		await common.delay(4000);

		// Step 5: Authenticate organizer in Zimbra and find the exception
		const account1AuthToken = await soap.getAccountAuthToken(
			account1Email,
			accountPassword,
		);

		await common.delay(3000);

		// Step 6: Find the updated exception in Zimbra
		const now = new Date();
		const expandStart = now.getTime();
		const expandEnd = expandStart + 7 * 24 * 60 * 60 * 1000;

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${expandStart}" calExpandInstEnd="${expandEnd}"
				limit="1000" offset="0">
				<query>(inid:"10")</query>
			</SearchRequest>`,
			account1AuthToken,
		);
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		const appts = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt
			: [searchRes.SearchResponse.appt];
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

		// Verify exception details
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${exceptionInvId}" />
			</GetMsgRequest>`,
			account1AuthToken,
		);
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		const exMsg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0]
			: getMsgRes.GetMsgResponse.m;
		const comp = Array.isArray(exMsg.inv) ? exMsg.inv[0] : exMsg.inv;
		const compData = Array.isArray(comp.comp) ? comp.comp[0] : comp.comp;
		assert.equal(
			compData.name,
			updatedSubject2,
			'Exception subject should match updated subject',
		);

		await common.delay(2000);

		// Step 7: Modify the exception from ZWC (ModifyAppointmentRequest)
		const startInfo = Array.isArray(compData.s) ? compData.s[0] : compData.s;
		const startD = startInfo.d;
		const ridZ = compData.ridZ;

		const modifyRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${exceptionInvId}" comp="0" sendInv="true">
				<m l="10">
					<su>${updatedSubject2}</su>
					<inv>
						<comp name="${updatedSubject2}" loc="">
							<s tz="Asia/Kolkata" d="${startD.replace('T', 'T').substring(0, 8)}T063000" />
							<e tz="Asia/Kolkata" d="${startD.substring(0, 8)}T073000" />
							<exceptId d="${ridZ}" />
							<fb>B</fb>
							<allDay>0</allDay>
							<class>PUB</class>
							<status>CONF</status>
						</comp>
					</inv>
				</m>
			</ModifyAppointmentRequest>`,
			account1AuthToken,
		);
		assert.notExists(modifyRes.Fault, 'Response should not be a Fault');
		assert.exists(
			modifyRes.ModifyAppointmentResponse,
			'ModifyAppointmentResponse should exist',
		);
		const modifiedInvId = modifyRes.ModifyAppointmentResponse.invId;
		assert.exists(modifiedInvId, 'Modified invId should exist');

		// Verify modification via GetMsg
		const getMsgRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${modifiedInvId}" />
			</GetMsgRequest>`,
			account1AuthToken,
		);
		assert.notExists(getMsgRes2.Fault, 'Response should not be a Fault');
		const modMsg = Array.isArray(getMsgRes2.GetMsgResponse.m)
			? getMsgRes2.GetMsgResponse.m[0]
			: getMsgRes2.GetMsgResponse.m;
		const modComp = Array.isArray(modMsg.inv) ? modMsg.inv[0] : modMsg.inv;
		const modCompData = Array.isArray(modComp.comp)
			? modComp.comp[0]
			: modComp.comp;
		assert.equal(
			modCompData.name,
			updatedSubject2,
			'Modified exception subject should match',
		);

		await common.delay(2000);

		// Step 8: Get the occurrence item id for instance 2 using EWS GetItem
		const getItemRes = await ews.makeEWSRequest(
			`<GetItem xmlns="http://schemas.microsoft.com/exchange/services/2006/messages">
				<ItemShape>
					<t:BaseShape>IdOnly</t:BaseShape>
				</ItemShape>
				<ItemIds>
					<t:OccurrenceItemId RecurringMasterId="${masterId}"
						InstanceIndex="2" />
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
		assert.exists(cancelTargetId, 'Occurrence ItemId should exist');

		await common.delay(1000);

		// Step 9: Cancel exception (occurrence) from Outlook via EWS
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

		await common.delay(5000);

		// Step 10: Verify in Zimbra that the exception instance is removed
		const day2Ms = new Date(day2Start).getTime();
		const narrowStart = day2Ms - 60 * 60 * 1000;
		const narrowEnd = day2Ms + 24 * 60 * 60 * 1000;

		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="${narrowStart}" calExpandInstEnd="${narrowEnd}">
				<query>(inid:"10")</query>
			</SearchRequest>`,
			account1AuthToken,
		);
		assert.notExists(searchRes2.Fault, 'Response should not be a Fault');

		// Verify no instances exist in that narrow window (exception was deleted)
		const remainingAppts = searchRes2.SearchResponse.appt;
		if (remainingAppts) {
			const rArr = Array.isArray(remainingAppts)
				? remainingAppts
				: [remainingAppts];
			for (const a of rArr) {
				if (!a || !a.inst) continue;
				const instArr = Array.isArray(a.inst) ? a.inst : [a.inst];
				for (const inst of instArr) {
					assert.notEqual(
						inst.ex,
						'1',
						'No exception instance should remain after cancellation',
					);
				}
			}
		}

		// Step 11: Verify attendee received cancellation mail with updated subject
		const account2AuthToken = await soap.getAccountAuthToken(
			account2Email,
			accountPassword,
		);

		await common.delay(5000);

		const searchRes3 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:${updatedSubject2}</query>
			</SearchRequest>`,
			account2AuthToken,
		);
		assert.notExists(searchRes3.Fault, 'Response should not be a Fault');
		const cancelMail = Array.isArray(searchRes3.SearchResponse.m)
			? searchRes3.SearchResponse.m[0]
			: searchRes3.SearchResponse.m;
		assert.exists(cancelMail, 'Cancellation mail should exist for attendee');
		const cancelMailId = cancelMail.id;

		const getMsgRes3 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${cancelMailId}" />
			</GetMsgRequest>`,
			account2AuthToken,
		);
		assert.notExists(getMsgRes3.Fault, 'Response should not be a Fault');
		const cancelMailMsg = Array.isArray(getMsgRes3.GetMsgResponse.m)
			? getMsgRes3.GetMsgResponse.m[0]
			: getMsgRes3.GetMsgResponse.m;
		assert.include(
			cancelMailMsg.su,
			`Cancelled: ${updatedSubject2}`,
			'Cancellation mail subject should include updated subject',
		);
		const cancelInv = Array.isArray(cancelMailMsg.inv)
			? cancelMailMsg.inv[0]
			: cancelMailMsg.inv;
		const cancelComp = Array.isArray(cancelInv.comp)
			? cancelInv.comp[0]
			: cancelInv.comp;
		assert.equal(
			cancelComp.method,
			'CANCEL',
			'Cancellation mail should have CANCEL method',
		);
	});
});
