import { assert } from 'chai';
import config from '../../../../../conf/config.js';
import common from '../../../../../framework/core/common.js';
import soap from '../../../../../framework/backend/soap-client.js';
import ews from '../../../../../framework/backend/ews.js';
import { main } from '../../../../../pages/main.js';

describe('EWS > Calendar > RecurringMeeting > ZCS-17714 > All Day Recurring Meeting Exception Update', function () {
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
	it('Sanity | Create a recurring meeting in Outlook (EWS) show all instances in ZWC When an occurrence is modified (exception created by changing date and subject) exception get updated for Organizer in ZWC', async () => {
		const unique = common.getUniqueString();
		const subject1 = `subject1.${unique}`;
		const updatedSubject2 = `updated_subject2.${unique}`;
		const uid = `${unique}-D714-429E-94D7-80A1A975F61E`;

		// Step 1: Create an ALL-DAY recurring meeting from Outlook
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
						<t:IsAllDayEvent>true</t:IsAllDayEvent>
						<t:ReminderIsSet>false</t:ReminderIsSet>
						<t:ExtendedProperty>
							<t:ExtendedFieldURI DistinguishedPropertySetId="Common"
								PropertyId="34051"
								PropertyType="Boolean" />
							<t:Value>true</t:Value>
						</t:ExtendedProperty>
						<t:UID>${uid}</t:UID>
						<t:Start>2025-12-18T00:00:00+05:30</t:Start>
						<t:End>2025-12-19T00:00:00+05:30</t:End>
						<t:LegacyFreeBusyStatus>Free</t:LegacyFreeBusyStatus>
						<t:Recurrence>
							<t:WeeklyRecurrence>
								<t:Interval>1</t:Interval>
								<t:DaysOfWeek>Thursday</t:DaysOfWeek>
								<t:FirstDayOfWeek>Sunday</t:FirstDayOfWeek>
							</t:WeeklyRecurrence>
							<t:EndDateRecurrence>
								<t:StartDate>2025-12-18</t:StartDate>
								<t:EndDate>2026-07-09</t:EndDate>
							</t:EndDateRecurrence>
						</t:Recurrence>
						<t:StartTimeZone Id="India Standard Time" />
						<t:EndTimeZone Id="India Standard Time" />
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
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0]
			: getMsgRes.GetMsgResponse.m;
		const inv = Array.isArray(msg.inv) ? msg.inv[0] : msg.inv;
		const comp = Array.isArray(inv.comp) ? inv.comp[0] : inv.comp;
		const recur = comp.recur;
		const rule = Array.isArray(recur.add) ? recur.add[0] : recur.add;
		const ruleData = Array.isArray(rule.rule) ? rule.rule[0] : rule.rule;
		const until = Array.isArray(ruleData.until)
			? ruleData.until[0]
			: ruleData.until;
		assert.equal(until.d, '20260709', 'Recurrence until date should match');
		assert.equal(comp.allDay, '1', 'Appointment should be all-day');
		const dur = Array.isArray(comp.dur) ? comp.dur[0] : comp.dur;
		assert.equal(dur.h, '24', 'Duration should be 24 hours');
		const startEl = Array.isArray(comp.s) ? comp.s[0] : comp.s;
		assert.equal(startEl.d, '20251218', 'Start date should match');

		// Step 2: Create exception (update occurrence #2) via EWS
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
								<t:FieldURI FieldURI="calendar:IsAllDayEvent" />
								<t:CalendarItem>
									<t:IsAllDayEvent>true</t:IsAllDayEvent>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:Start" />
								<t:CalendarItem>
									<t:Start>2025-12-26T00:00:00+05:30</t:Start>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:End" />
								<t:CalendarItem>
									<t:End>2025-12-27T00:00:00+05:30</t:End>
								</t:CalendarItem>
							</t:SetItemField>
							<t:SetItemField>
								<t:FieldURI FieldURI="calendar:LegacyFreeBusyStatus" />
								<t:CalendarItem>
									<t:LegacyFreeBusyStatus>Free</t:LegacyFreeBusyStatus>
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

		// Step 3: Verify the exception in ZWC
		await common.delay(5000);

		// Search for exception instance (Dec 25-26 window around the exception date)
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment"
				calExpandInstStart="1766620800000" calExpandInstEnd="1766793600000"
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

		// Verify exception details via GetMsg
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
		assert.equal(exComp.ex, '1', 'Should be an exception instance');
		assert.equal(
			exComp.name,
			updatedSubject2,
			'Exception subject should match',
		);
		assert.equal(exComp.allDay, '1', 'Exception should be all-day');
		const exStart = Array.isArray(exComp.s) ? exComp.s[0] : exComp.s;
		assert.equal(exStart.d, '20251226', 'Exception start date should match');
		const exDur = Array.isArray(exComp.dur) ? exComp.dur[0] : exComp.dur;
		assert.equal(exDur.d, '1', 'Exception duration should be 1 day');
	});
});
